// client/src/hooks/useClickOutside.js
import { useEffect, useRef } from 'react';

/**
 * Detect clicks outside of a ref element
 * @param {Function} callback - Function to call on outside click
 * @returns {React.RefObject} - Ref to attach to the element
 */
const useClickOutside = (callback) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [callback]);

  return ref;
};

export default useClickOutside;
