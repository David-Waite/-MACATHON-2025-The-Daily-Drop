import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
} from "@react-google-maps/api";
import { auth } from "../firebase"; // Make sure auth is imported
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
// --- Firebase Imports ---
import { db, storage } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  GeoPoint,
  addDoc,
  getDocs,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth"; // Import Firebase Auth
import { useNavigate } from "react-router-dom"; // For redirect after logout

// --- Geolocation Helper ---
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d * 1000; // Distance in meters
}
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// --- Map Styling & Configuration ---
const containerStyle = {
  width: "100%",
  height: "100vh",
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  clickableIcons: false,
};

const libraries = ["places"];

function MapComponent({ userId }) {
  const [userPosition, setUserPosition] = useState(null);
  const [drops, setDrops] = useState([]);
  const [selectedDrop, setSelectedDrop] = useState(null);
  const [map, setMap] = useState(null);

  const defaultCenter = { lat: -37.8111, lng: 144.9469 };
  const DISTANCE_THRESHOLD_METERS = 30000;
  //IMPORT CHANGE BACK THRESHOLD METERS

  const navigate = useNavigate(); // For redirect after logout
  const fileInputRef = useRef(null); // Create a ref for the file input
  const [isUploading, setIsUploading] = useState(false); // State for loading indicator
  const [dropToSubmit, setDropToSubmit] = useState(null); // Store drop info during upload
  // --- Logout Function ---
  const handleLogout = () => {
    const auth = getAuth();
    signOut(auth)
      .then(() => {
        console.log("User signed out");
        navigate("/login"); // Redirect to login page
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  };

  // --- User Location ---
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserPosition({ lat: latitude, lng: longitude });
      },
      (error) => {
        console.error("Error getting user location:", error);
        if (!userPosition) {
          setUserPosition(defaultCenter);
        }
      },
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // --- Google Maps API Loader ---
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_Maps_API_KEY,
    libraries: libraries,
  });

  // --- Fetch Active Drops ---
  useEffect(() => {
    const dropsRef = collection(db, "drops");
    const now = Timestamp.now();
    const q = query(dropsRef, where("startTime", "<=", now));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const activeDrops = [];
        querySnapshot.forEach((doc) => {
          const dropData = doc.data();
          if (dropData.endTime && dropData.endTime >= now) {
            if (dropData.location instanceof GeoPoint) {
              activeDrops.push({
                id: doc.id,
                ...dropData,
                position: {
                  lat: dropData.location.latitude,
                  lng: dropData.location.longitude,
                },
              });
            }
          }
        });
        setDrops(activeDrops);
      },
      (error) => {
        console.error("Error fetching drops:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // --- Capture Attempt ---
  // ... inside MapPage component ...

  const handleCaptureAttempt = async (dropData) => {
    // <--- Make async
    const user = auth.currentUser; // Get current user info

    if (!user) {
      alert("Please log in to capture drops.");
      return;
    }
    const currentUserId = user.uid;

    if (!userPosition) {
      alert(
        "Could not get your current location. Please enable location services and wait for GPS fix."
      );
      return;
    }

    if (!dropData || !dropData.position || !dropData.id) {
      // Also check for dropData.id
      console.error(
        "Drop data, position, or ID missing in handleCaptureAttempt"
      );
      alert("Error: Could not identify the selected drop.");
      return;
    }
    const selectedDropId = dropData.id; // Get the drop ID

    const distance = getDistanceFromLatLonInKm(
      userPosition.lat,
      userPosition.lng,
      dropData.position.lat,
      dropData.position.lng
    );

    console.log(`Distance to drop: ${distance.toFixed(2)} meters`);

    if (distance <= DISTANCE_THRESHOLD_METERS) {
      // --- Check if already submitted ---
      try {
        const submissionsRef = collection(db, "submissions");
        const q = query(
          submissionsRef,
          where("userId", "==", currentUserId),
          where("dropId", "==", selectedDropId),
          limit(1) // We only need to know if at least one exists
        );

        console.log(
          `Checking for existing submission: userId=${currentUserId}, dropId=${selectedDropId}`
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // Found an existing submission
          console.log("User has already submitted for this drop.");
          alert("You have already captured this drop!");
          return; // Stop processing
        } else {
          // No existing submission found, proceed with capture
          console.log("No existing submission found. Proceeding to capture.");
          setDropToSubmit(dropData); // Store drop info
          fileInputRef.current.click(); // Trigger hidden file input
        }
      } catch (error) {
        console.error("Error checking for existing submission:", error);
        alert("Could not verify submission status. Please try again.");
        return; // Stop on error
      }
      // --- End check ---
    } else {
      alert(`Too far! Get within ${DISTANCE_THRESHOLD_METERS} meters.`);
    }
  };

  // --- Remember to keep the onClick on the button ---
  // <button onClick={() => handleCaptureAttempt(selectedDrop)} disabled={isUploading}> ... </button>

  const onLoad = useCallback(
    function callback(mapInstance) {
      const initialCenter = userPosition || defaultCenter;
      mapInstance.setCenter(initialCenter);
      mapInstance.setZoom(16);
      setMap(mapInstance);
    },
    [userPosition, defaultCenter]
  );

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  if (loadError) {
    return (
      <div>
        Error loading maps: {loadError.message} <br /> Make sure your API key is
        correct and billing is enabled.
      </div>
    );
  }

  if (!isLoaded) {
    return <div>Loading Map...</div>;
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    const user = auth.currentUser; // Get current user

    // Make sure we still have the drop info and user is logged in
    if (!file || !dropToSubmit || !user) {
      console.error("File, drop info, or user missing for upload.");
      alert("Could not initiate upload. Please try again.");
      setDropToSubmit(null); // Clear the stored drop
      // Clear the file input value so onChange fires again if the same file is chosen
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Check if file is an image (basic check)
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      setDropToSubmit(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Start the upload process
    uploadPhotoAndUpdateFirestore(file, user.uid, dropToSubmit.id);

    // Clear the file input value after selection
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadPhotoAndUpdateFirestore = async (file, userId, dropId) => {
    setIsUploading(true); // Show loading state
    setDropToSubmit(null); // Clear the temporary drop state

    // Create a unique filename for storage
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const uniqueFileName = `${userId}-${timestamp}.${fileExtension}`;
    const filePath = `submissions/${dropId}/${uniqueFileName}`; // Structure storage path

    try {
      // Get storage reference
      const storageRef = ref(storage, filePath);

      // Start the upload task
      const uploadTask = uploadBytesResumable(storageRef, file);

      // --- Optional: Monitor upload progress ---
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log("Upload is " + progress + "% done");
          // You could update UI with progress here
        },
        (error) => {
          // Handle unsuccessful uploads
          console.error("Upload failed:", error);
          alert(`Upload failed: ${error.message}`);
          setIsUploading(false); // Hide loading state
        },
        async () => {
          // Handle successful uploads on complete
          console.log("File uploaded successfully!");
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("File available at", downloadURL);

            // --- Now, add submission record to Firestore ---
            const submissionsRef = collection(db, "submissions");
            const submissionData = {
              userId: userId,
              dropId: dropId,
              photoUrl: downloadURL,
              timestamp: serverTimestamp(), // Use server time
            };

            await addDoc(submissionsRef, submissionData);
            console.log("Submission record added to Firestore");
            alert("Drop captured successfully!");
            setSelectedDrop(null); // Close the InfoWindow
            setIsUploading(false); // Hide loading state
          } catch (firestoreError) {
            console.error(
              "Error adding submission to Firestore:",
              firestoreError
            );
            alert(`Capture failed (database error): ${firestoreError.message}`);
            setIsUploading(false);
          }
        }
      );
    } catch (error) {
      console.error("Error setting up the upload:", error);
      alert(`Upload setup failed: ${error.message}`);
      setIsUploading(false);
    }
  };

  const handleGoToleaderboard = () => {
    console.log("Navigating to /profile...");
    // 3. Call navigate with the target path
    navigate("/leaderboard");
  };
  return (
    <>
      {/* --- Logout Button --- */}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 999 }}>
        <button onClick={handleLogout}>Log Out</button>
      </div>

      {/* --- Leaderboard button --- */}
      <div
        onClick={handleGoToleaderboard}
        style={{ position: "absolute", top: 10, right: 10, zIndex: 999 }}
      >
        leader board
      </div>
      <input
        type="file"
        accept="image/*" // Allow any image type
        capture // On mobile, hints to use the camera directly
        style={{ display: "none" }} // Keep it hidden
        ref={fileInputRef}
        onChange={handleFileSelect} // We'll create this function next
      />

      <GoogleMap
        mapContainerStyle={containerStyle}
        zoom={16}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
        center={{ lat: -37.8106, lng: 144.9545 }}
      >
        {userPosition && userPosition !== defaultCenter && (
          <MarkerF position={userPosition} title={"You are here"} />
        )}

        {drops.map((drop) => (
          <MarkerF
            key={drop.id}
            position={drop.position}
            onClick={() => {
              setSelectedDrop(drop);
            }}
          />
        ))}

        {selectedDrop && (
          <InfoWindowF
            position={selectedDrop.position}
            onCloseClick={() => {
              setSelectedDrop(null);
            }}
          >
            <div>
              <h4>{selectedDrop.name || "Unnamed Drop"}</h4>
              <p>
                Expires at:{" "}
                {selectedDrop.endTime?.toDate().toLocaleTimeString()}
              </p>
              <button
                onClick={() => handleCaptureAttempt(selectedDrop)} // Pass selectedDrop
                disabled={isUploading} // Disable button while uploading
              >
                {isUploading ? "Uploading..." : "Attempt Capture"}
              </button>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </>
  );
}

export default MapComponent;
