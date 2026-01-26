import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Component wrapper để force reload khi route thay đổi
 * Sử dụng key prop để force remount component khi location thay đổi
 */
interface RouteReloaderProps {
  children: React.ReactNode;
  onRouteChange?: () => void;
}

const RouteReloader = ({ children, onRouteChange }: RouteReloaderProps) => {
  const location = useLocation();

  useEffect(() => {
    // Call callback when route changes
    if (onRouteChange) {
      onRouteChange();
    }
  }, [location.pathname, location.search, onRouteChange]);

  return <>{children}</>;
};

export default RouteReloader;
