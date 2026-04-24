declare module "canvas-confetti" {
  function confetti(options?: Record<string, unknown>): Promise<null> | void;
  export default confetti;
}
