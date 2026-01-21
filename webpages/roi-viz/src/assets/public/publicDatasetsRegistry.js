const PUBLIC_DATASETS = {
  "mni": async () => ({
    meta: (await import("./mni/brain19roiMeta.js")).default,
    atlases: [
      "mni/brainnetome",
      "mni/diedrichsen2009",
    ]
  }),
};

export { PUBLIC_DATASETS };