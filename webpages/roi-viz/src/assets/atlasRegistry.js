export const atlasRegistry = [];

export function registerAtlas(atlas) {
  atlasRegistry.push(atlas);
}

export function clearAtlasRegistry() {
  atlasRegistry.length = 0;
}
