// TEAM 1: previews and scenario playback never write to the user's saved state.
export class DemoSession {
  constructor({load, save}) {
    this.write = save;
    this.saved = structuredClone(load());
    this.active = false;
  }
  checkpoint(state) {
    if (this.active) return false;
    this.saved = structuredClone(state);
    this.write(state);
    return true;
  }
  enter(state) {
    if (!this.active) this.saved = structuredClone(state);
    this.active = true;
  }
  leave() {
    this.active = false;
    return structuredClone(this.saved);
  }
}
