let locks = 0;
let restore: (() => void) | undefined;

function preserve(style: CSSStyleDeclaration, properties: string[]) {
  const values = properties.map(property => [property, style.getPropertyValue(property), style.getPropertyPriority(property)]);
  return () => values.forEach(([property, value, priority]) => {
    if (value) style.setProperty(property, value, priority);
    else style.removeProperty(property);
  });
}

/** Keep the gallery stationary on mobile, including while a second preview is open. */
export function lockPageScroll() {
  if (locks === 0) {
    const { scrollX, scrollY } = window;
    const width = document.documentElement.clientWidth;
    const body = document.body.style;
    const root = document.documentElement.style;
    const restoreBody = preserve(body, ['position', 'top', 'left', 'width', 'overflow']);
    const restoreRoot = preserve(root, ['overflow', 'overscroll-behavior']);

    root.overflow = 'hidden';
    root.overscrollBehavior = 'none';
    body.position = 'fixed';
    body.top = `${-scrollY}px`;
    body.left = `${-scrollX}px`;
    body.width = `${width}px`;
    body.overflow = 'hidden';
    restore = () => {
      restoreBody();
      restoreRoot();
      window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
    };
  }
  locks += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    if (locks === 0) {
      restore?.();
      restore = undefined;
    }
  };
}
