declare module "canvas-confetti" {
  type ConfettiOptions = Record<string, unknown>;
  type ConfettiFn = (options?: ConfettiOptions) => Promise<null> | null;
  const confetti: ConfettiFn;
  export default confetti;
}
