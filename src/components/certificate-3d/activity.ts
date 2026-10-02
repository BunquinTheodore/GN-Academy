/**
 * Reports whether the viewer should be rendering: on screen (IntersectionObserver)
 * and in a visible tab (visibilitychange). Returns a cleanup function.
 */
export function observeActivity(
  element: Element,
  onChange: (active: boolean) => void,
): () => void {
  let onScreen = true;
  let tabVisible = document.visibilityState !== "hidden";
  let last: boolean | undefined;

  const emit = () => {
    const active = onScreen && tabVisible;
    if (active === last) return;
    last = active;
    onChange(active);
  };

  const observer =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver((entries) => {
          onScreen = entries.some((entry) => entry.isIntersecting);
          emit();
        });
  observer?.observe(element);

  const onVisibility = () => {
    tabVisible = document.visibilityState !== "hidden";
    emit();
  };
  document.addEventListener("visibilitychange", onVisibility);
  emit();

  return () => {
    observer?.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
