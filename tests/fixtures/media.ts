import type { MediaItem } from "../../lib/types";
import { at, inWorkspace } from "./helpers";
import { KESTREL } from "./workspaces";

export const media = inWorkspace<MediaItem>(KESTREL, [
  { id: "m1", name: "autumn-launch-hero.jpg", type: "image", width: 2400, height: 1600, sizeKb: 812, tags: ["autumn", "launch", "hero"], hues: [24, 340], createdAt: at(-20) },
  { id: "m2", name: "team-offsite.jpg", type: "image", width: 2000, height: 2000, sizeKb: 640, tags: ["team", "culture"], hues: [200, 260], createdAt: at(-18) },
  { id: "m3", name: "product-closeup.jpg", type: "image", width: 1600, height: 2000, sizeKb: 530, tags: ["product", "studio"], hues: [160, 210], createdAt: at(-15) },
  { id: "m4", name: "behind-the-scenes.mp4", type: "video", width: 1080, height: 1920, sizeKb: 18_400, durationSec: 34, tags: ["bts", "reel", "team"], hues: [280, 330], createdAt: at(-14) },
  { id: "m5", name: "customer-story.mp4", type: "video", width: 1920, height: 1080, sizeKb: 52_100, durationSec: 128, tags: ["customer", "testimonial"], hues: [190, 140], createdAt: at(-12) },
  { id: "m6", name: "webinar-banner.png", type: "image", width: 1920, height: 1005, sizeKb: 310, tags: ["webinar", "event"], hues: [230, 190], createdAt: at(-10) },
  { id: "m7", name: "holiday-moodboard.jpg", type: "image", width: 1000, height: 1500, sizeKb: 420, tags: ["holiday", "moodboard"], hues: [0, 40], createdAt: at(-9) },
  { id: "m8", name: "how-to-tutorial.mp4", type: "video", width: 1080, height: 1920, sizeKb: 24_800, durationSec: 58, tags: ["tutorial", "reel", "product"], hues: [45, 90], createdAt: at(-7) },
  { id: "m9", name: "flatlay-coffee.jpg", type: "image", width: 2000, height: 2000, sizeKb: 590, tags: ["lifestyle", "studio"], hues: [25, 60], createdAt: at(-6) },
  { id: "m10", name: "infographic-q3.png", type: "image", width: 1080, height: 1350, sizeKb: 270, tags: ["data", "report"], hues: [250, 180], createdAt: at(-4) },
  { id: "m11", name: "office-dog.jpg", type: "image", width: 1600, height: 1600, sizeKb: 480, tags: ["culture", "fun"], hues: [35, 15], createdAt: at(-3) },
  { id: "m12", name: "launch-teaser.mp4", type: "video", width: 1920, height: 1080, sizeKb: 31_000, durationSec: 15, tags: ["launch", "teaser"], hues: [300, 220], createdAt: at(-1) },
]);
