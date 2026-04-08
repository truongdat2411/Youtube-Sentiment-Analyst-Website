import { describe, expect, it } from "vitest";

import { extractYouTubeVideoId, isValidYouTubeUrl } from "../src/utils/youtube";

describe("YouTube URL validation helper", () => {
  it("accepts supported YouTube URL formats", () => {
    const expectedVideoId = "dQw4w9WgXcQ";
    const urls = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    ];

    for (const url of urls) {
      expect(isValidYouTubeUrl(url)).toBe(true);
      expect(extractYouTubeVideoId(url)).toBe(expectedVideoId);
    }
  });

  it("rejects empty or non-YouTube URLs", () => {
    const invalidUrls = [
      "",
      "   ",
      "https://example.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=short",
      "not a url",
    ];

    for (const url of invalidUrls) {
      expect(isValidYouTubeUrl(url)).toBe(false);
      expect(extractYouTubeVideoId(url)).toBeNull();
    }
  });
});
