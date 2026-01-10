import { registerAtlas } from "./atlasRegistry.js";

if (window.FMRIVIZ_CONFIG.showRestricted) {
    registerAtlas({
        id: "brainstem",
        label: "Brainstem Navigator",
        path: "../assets/private/mni/brainstemnavigator/",
        restricted: true
    });
}
