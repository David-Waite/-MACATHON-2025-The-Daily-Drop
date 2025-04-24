import React, { useRef, useState } from "react";
import { GoogleMap, MarkerF, useJsApiLoader, Autocomplete } from "@react-google-maps/api";

function AdminMapPicker({ selectedLat, selectedLng, setSelectedLat, setSelectedLng, searchBoxStyle, searchInputStyle }) {
  const libraries = ["places"];
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_Maps_API_KEY,
    libraries: libraries,
  });

  const defaultCenter = { lat: -37.8111, lng: 144.9469 };
  const mapRef = useRef(null);
  const [autocomplete, setAutocomplete] = useState(null);

  const handleMapClick = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setSelectedLat(lat);
    setSelectedLng(lng);
  };

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setSelectedLat(lat);
        setSelectedLng(lng);
        mapRef.current.panTo({ lat, lng });
      }
    }
  };

  if (loadError) {
    return <div style={{ color: "red" }}>Error loading map: {loadError.message}</div>;
  }

  if (!isLoaded) {
    return <div>Loading map...</div>;
  }

  return (
    <div className="relative w-full" style={{ height: "100vh" }}>
      <div style={searchBoxStyle}>
        <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
          <input
            type="text"
            placeholder="Search for a location"
            style={searchInputStyle}
          />
        </Autocomplete>
      </div>

      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={selectedLat && selectedLng ? { lat: selectedLat, lng: selectedLng } : defaultCenter}
        zoom={15}
        onClick={handleMapClick}
        onLoad={(map) => (mapRef.current = map)}
      >
        {selectedLat && selectedLng && (
          <MarkerF position={{ lat: selectedLat, lng: selectedLng }} />
        )}
      </GoogleMap>
    </div>
  );
}

export default AdminMapPicker;
