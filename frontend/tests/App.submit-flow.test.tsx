import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../src/App";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function deferredPromise<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const watchUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const shortUrl = "https://youtu.be/dQw4w9WgXcQ";
const shortsUrl = "https://www.youtube.com/shorts/dQw4w9WgXcQ";

function getAnalyzeButton() {
  return screen.getByRole("button", { name: "Analyze" });
}

function getYoutubeInput() {
  return screen.getByPlaceholderText("https://www.youtube.com/watch?v=...");
}

describe("App submit flow and validation", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("empty input shows 'Please enter a YouTube URL.' and blocks submit", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(screen.getByText("Please enter a YouTube URL.")).toBeInTheDocument();
    expect(getAnalyzeButton()).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("invalid non-YouTube link shows 'Please enter a valid YouTube link.' and blocks submit", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await user.type(getYoutubeInput(), "https://example.com/not-youtube");
    await user.tab();

    expect(screen.getByText("Please enter a valid YouTube link.")).toBeInTheDocument();
    expect(getAnalyzeButton()).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("valid YouTube watch URL submits successfully and renders results", async () => {
    const user = userEvent.setup();
    const fetchDeferred = deferredPromise<Response>();
    const fetchMock = vi.fn().mockReturnValueOnce(fetchDeferred.promise);
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await user.type(getYoutubeInput(), watchUrl);
    expect(getAnalyzeButton()).toBeEnabled();
    await user.click(getAnalyzeButton());

    expect(screen.getByText("Analyzing comments... Please wait.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchDeferred.resolve(
      jsonResponse(200, {
        video_id: "dQw4w9WgXcQ",
        video_title: "Test Video",
        items: [
          {
            comment_id: "c1",
            author: "@tester",
            published_at: "2026-03-07T00:00:00Z",
            text: "Great video!",
            label: "POS",
            probs: { NEG: 0.01, NEU: 0.09, POS: 0.9 },
          },
        ],
      })
    );

    expect(await screen.findByText("Great video!")).toBeInTheDocument();
    expect(screen.getByText("@tester")).toBeInTheDocument();
    expect(screen.getByText("Video: Test Video")).toBeInTheDocument();
    expect(screen.getByText("Total: 1 | NEG: 0 | NEU: 0 | POS: 1")).toBeInTheDocument();
    expect(screen.getByText("Statistics")).toBeInTheDocument();
    expect(screen.getByTestId("sentiment-donut-chart")).toBeInTheDocument();
    expect(screen.getByTestId("sentiment-bar-chart")).toBeInTheDocument();
    expect(screen.getByAltText("Video thumbnail")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText("Analyzing comments... Please wait.")).not.toBeInTheDocument()
    );
  });

  it("valid youtu.be URL is accepted", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn());
    render(<App />);

    await user.type(getYoutubeInput(), shortUrl);

    expect(screen.queryByText("Please enter a valid YouTube link.")).not.toBeInTheDocument();
    expect(getAnalyzeButton()).toBeEnabled();
  });

  it("valid shorts URL is accepted", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn());
    render(<App />);

    await user.type(getYoutubeInput(), shortsUrl);

    expect(screen.queryByText("Please enter a valid YouTube link.")).not.toBeInTheDocument();
    expect(getAnalyzeButton()).toBeEnabled();
  });

  it("Analyze button is disabled when input is empty or invalid", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn());
    render(<App />);

    expect(getAnalyzeButton()).toBeDisabled();

    await user.type(getYoutubeInput(), "abc");
    expect(getAnalyzeButton()).toBeDisabled();

    await user.clear(getYoutubeInput());
    expect(getAnalyzeButton()).toBeDisabled();

    await user.type(getYoutubeInput(), watchUrl);
    expect(getAnalyzeButton()).toBeEnabled();
  });

  it("search/filter/sort/export still work after successful results render", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, {
        video_id: "vid1",
        video_title: "Feature Check",
        items: [
          {
            comment_id: "c1",
            author: "Alice",
            published_at: "2026-03-07T02:00:00Z",
            text: "Great product",
            label: "POS",
            probs: { NEG: 0.01, NEU: 0.04, POS: 0.95 },
          },
          {
            comment_id: "c2",
            author: "Bob",
            published_at: "2026-03-07T01:00:00Z",
            text: "It is okay",
            label: "NEU",
            probs: { NEG: 0.08, NEU: 0.84, POS: 0.08 },
          },
          {
            comment_id: "c3",
            author: "Carol",
            published_at: "2026-03-07T00:00:00Z",
            text: "Bad quality",
            label: "NEG",
            probs: { NEG: 0.92, NEU: 0.06, POS: 0.02 },
          },
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: revokeObjectURL,
    });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<App />);

    await user.type(getYoutubeInput(), watchUrl);
    await user.click(getAnalyzeButton());

    expect(await screen.findByText("Great product")).toBeInTheDocument();
    expect(screen.getByText(/Video:\s*Feature Check/)).toBeInTheDocument();
    expect(document.querySelectorAll("tbody tr")).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "NEG" }));
    expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(screen.getByText("Bad quality")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ALL" }));
    await user.type(screen.getByPlaceholderText("Type to filter results..."), "bob");
    expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(screen.getByText("Bob")).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Type to filter results..."));
    await user.selectOptions(screen.getByLabelText("Sort by"), "CONF_ASC");
    const firstRowText = document.querySelector("tbody tr td:nth-child(4)")?.textContent ?? "";
    expect(firstRowText.toLowerCase()).toContain("it is okay");

    await user.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it("shows backend timeout/failure error and exits loading state", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(504, { detail: "Analyze request timed out after 90s." }));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await user.type(getYoutubeInput(), watchUrl);
    await user.click(getAnalyzeButton());

    expect(await screen.findByText("Analyze request timed out after 90s.")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText("Analyzing comments... Please wait.")).not.toBeInTheDocument()
    );
  });
});
