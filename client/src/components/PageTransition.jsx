// client/src/components/PageTransition.jsx
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const PageTransition = ({ children, type = 'fade' }) => {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState('enter');

  useEffect(() => {
    if (children !== displayChildren) {
      // Start exit animation
      setTransitionStage('exit');

      // After exit animation, update children and start enter
      const timer = setTimeout(() => {
        setDisplayChildren(children);
        setTransitionStage('enter');
      }, 200); // Match exit duration

      return () => clearTimeout(timer);
    }
  }, [children, displayChildren]);

  const getTransitionClasses = () => {
    const transitions = {
      fade: {
        enter: 'animate-fade-in',
        exit: 'opacity-0 transition-opacity duration-200',
      },
      slide: {
        enter: 'animate-slide-in-right',
        exit: 'opacity-0 -translate-x-8 transition-all duration-200',
      },
      scale: {
        enter: 'animate-scale-in',
        exit: 'opacity-0 scale-95 transition-all duration-200',
      },
      slideUp: {
        enter: 'animate-slide-up',
        exit: 'opacity-0 translate-y-4 transition-all duration-200',
      },
    };

    return transitions[type]?.[transitionStage] || transitions.fade[transitionStage];
  };

  return (
    <div key={location.pathname} className={getTransitionClasses()}>
      {displayChildren}
    </div>
  );
};

export default PageTransition;
