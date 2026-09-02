import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, DARK_MAP_STYLE } from '../utils/googleMaps';
import { MapPin, Navigation, ExternalLink, Copy, Check, Radio } from 'lucide-react';

interface GpsPoint {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}

interface GoogleMapTrackerProps {
  currentCoords?: GpsPoint | null;
  gpsPath?: GpsPoint[];
  title?: string;
  height?: string;
  isDistress?: boolean;
}

export const GoogleMapTracker: React.FC<GoogleMapTrackerProps> = ({
  currentCoords,
  gpsPath = [],
  title = 'Live GPS Location',
  height = '340px',
  isDistress = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);

  const [mapError, setMapError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const lat = currentCoords?.lat ?? 12.9716;
  const lng = currentCoords?.lng ?? 77.5946;
  const accuracy = currentCoords?.accuracy;

  // Initialize and update Google Maps JS API
  useEffect(() => {
    let isMounted = true;

    loadGoogleMaps()
      .then((maps) => {
        if (!isMounted || !containerRef.current) return;

        // 1. Initialize map if not already done
        if (!mapInstanceRef.current) {
          const map = new maps.Map(containerRef.current, {
            center: { lat, lng },
            zoom: 16,
            styles: DARK_MAP_STYLE,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });

          mapInstanceRef.current = map;

          // Distress pulse marker
          const marker = new maps.Marker({
            position: { lat, lng },
            map,
            title: isDistress ? '🚨 SilentSOS Distress Signal' : '📍 Current Location',
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: isDistress ? '#ef4444' : '#10b981',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2.5,
            },
          });
          markerRef.current = marker;

          // Accuracy circle
          if (accuracy) {
            const circle = new maps.Circle({
              strokeColor: isDistress ? '#ef4444' : '#10b981',
              strokeOpacity: 0.5,
              strokeWeight: 1.5,
              fillColor: isDistress ? '#ef4444' : '#10b981',
              fillOpacity: 0.15,
              map,
              center: { lat, lng },
              radius: accuracy,
            });
            circleRef.current = circle;
          }

          // Polyline path
          if (gpsPath && gpsPath.length > 1) {
            const polyline = new maps.Polyline({
              path: gpsPath.map((p) => ({ lat: p.lat, lng: p.lng })),
              geodesic: true,
              strokeColor: '#f87171',
              strokeOpacity: 0.85,
              strokeWeight: 4,
            });
            polyline.setMap(map);
            polylineRef.current = polyline;
          }
        } else {
          // 2. Update existing map
          const map = mapInstanceRef.current;
          const newPos = { lat, lng };

          map.panTo(newPos);

          if (markerRef.current) {
            markerRef.current.setPosition(newPos);
          }

          if (circleRef.current) {
            circleRef.current.setCenter(newPos);
            if (accuracy) circleRef.current.setRadius(accuracy);
          }

          if (polylineRef.current && gpsPath && gpsPath.length > 1) {
            polylineRef.current.setPath(gpsPath.map((p) => ({ lat: p.lat, lng: p.lng })));
          }
        }
      })
      .catch((err) => {
        console.warn('Google Maps JS API load notice:', err.message);
        if (isMounted) {
          setMapError(err.message || 'Google Maps API Error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [lat, lng, accuracy, gpsPath, isDistress]);

  const copyCoordinates = () => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const googleMapsViewUrl = `https://maps.google.com/?q=${lat},${lng}`;

  return (
    <div className="relative flex flex-col w-full rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d14] shadow-xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${isDistress ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            <MapPin className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide flex items-center gap-2">
              {title}
              {isDistress && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/30">
                  LIVE GPS
                </span>
              )}
            </h3>
            <p className="text-[10px] text-white/50 font-mono">
              {lat.toFixed(6)}, {lng.toFixed(6)} {accuracy ? `(±${Math.round(accuracy)}m)` : ''}
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={copyCoordinates}
            title="Copy GPS coordinates"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <a
            href={googleMapsDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Navigate via Google Maps"
            className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-md shadow-red-900/30"
          >
            <Navigation className="w-3 h-3" />
            <span>Navigate</span>
          </a>
        </div>
      </div>

      {/* Map display area */}
      <div className="relative w-full overflow-hidden" style={{ height }}>
        {/* Google Maps JS Container */}
        <div ref={containerRef} className="w-full h-full" />

        {/* Fallback iframe embed if JS API key has restrictions / pending billing */}
        {mapError && (
          <iframe
            title="Google Maps Location View"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=16&output=embed`}
            className="absolute inset-0 w-full h-full"
          />
        )}

        {/* Real-time distress radar overlay */}
        {isDistress && (
          <div className="absolute top-3 left-3 pointer-events-none z-10 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-red-500/30">
            <Radio className="w-3 h-3 text-red-400 animate-pulse" />
            <span className="text-[10px] text-red-300 font-bold uppercase tracking-wider">
              Google Maps Satellite Tracking
            </span>
          </div>
        )}

        {/* Open in Google Maps Badge */}
        <a
          href={googleMapsViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 z-10 bg-black/80 hover:bg-black backdrop-blur-md border border-white/20 text-white text-[10px] font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-lg transition-all hover:border-red-500/50"
        >
          <ExternalLink className="w-3 h-3 text-red-400" />
          <span>Open in Google Maps</span>
        </a>
      </div>
    </div>
  );
};
