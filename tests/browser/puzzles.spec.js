import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const state = (frame) =>
  frame.evaluate(() => {
    const stage = window.Konva.stages[0];
    const layer = stage.getLayers()[0];
    return {
      width: stage.width(),
      height: stage.height(),
      scale: layer.scaleX(),
      pieces: layer.getChildren().map((node) => ({
        id: node.name(),
        ...node.position(),
        shadow: node.shadowColor(),
        opacity: node.opacity(),
        image: !!node.fillPatternImage(),
        offsetX: node.fillPatternX(),
        offsetY: node.fillPatternY(),
      })),
    };
  });

// Find a visible point belonging to a piece through Konva's actual hit canvas.
const hitPoint = async (frame, id) => {
  await frame.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  return frame.evaluate((id) => {
    const stage = window.Konva.stages[0];
    for (let y = 4; y < stage.height(); y += 4) {
      for (let x = 4; x < stage.width(); x += 4) {
        if (stage.getIntersection({ x, y })?.name() === id) return { x, y };
      }
    }
    throw new Error("No visible hit point for " + id);
  }, id);
};

async function drag(page, point, delta, touch) {
  if (touch) {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point],
    });
    for (let step = 1; step <= 10; step++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: point.x + (delta.x * step) / 10,
            y: point.y + (delta.y * step) / 10,
          },
        ],
      });
    }
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await session.detach();
  } else {
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + delta.x, point.y + delta.y, { steps: 10 });
    await page.mouse.up();
  }
}

for (const puzzle of [1, 2]) {
  for (const touch of [false, true]) {
    test(`puzzle ${puzzle}: ${touch ? "touch" : "mouse"}, snapping, groups and reset`, async ({
      page,
    }) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`/marsha-puzzle/?puzzle=${puzzle}`);
      await expect(page.locator("canvas")).toBeVisible();
      await expect
        .poll(async () => (await state(page)).pieces.every((p) => p.image))
        .toBe(true);
      const initializers = JSON.parse(
        readFileSync(`src/assets/puzzle${puzzle}.initializers.json`),
      );
      const initial = await state(page);
      expect(initial.width).toBe(1280);
      expect(initial.height).toBe(900);
      expect(initial.pieces).toHaveLength(5);
      for (const piece of initial.pieces) {
        expect({ x: piece.x, y: piece.y }).toEqual(
          initializers[piece.id].initialPosition,
        );
        expect(piece.offsetX).toBe(initializers[piece.id].fillPatternOffset.x);
        expect(piece.offsetY).toBe(initializers[piece.id].fillPatternOffset.y);
      }
      const leader = initial.pieces[0];
      const neighbor = initial.pieces[1];
      const point = await hitPoint(page, leader.id);
      if (!touch) {
        await page.mouse.move(point.x, point.y);
        await expect
          .poll(async () => (await state(page)).pieces[0].opacity)
          .toBe(0.8);
        expect(
          await page.locator("body").evaluate((el) => el.style.cursor),
        ).toBe("grab");
        await page.mouse.move(0, 0);
        await expect
          .poll(async () => (await state(page)).pieces[0].opacity)
          .toBe(1);
      }
      if (touch) await page.touchscreen.tap(point.x, point.y);
      else await page.mouse.click(point.x, point.y);
      await expect
        .poll(async () => (await state(page)).pieces.at(-1).id)
        .toBe(leader.id);
      await drag(
        page,
        point,
        {
          x: (neighbor.x - leader.x) * initial.scale,
          y: (neighbor.y - leader.y) * initial.scale,
        },
        touch,
      );
      await expect
        .poll(async () => {
          const pieces = (await state(page)).pieces;
          const a = pieces.find((p) => p.id === leader.id),
            b = pieces.find((p) => p.id === neighbor.id);
          return Math.hypot(a.x - b.x, a.y - b.y);
        })
        .toBeLessThan(0.001);
      let snapped = await state(page);
      expect(snapped.pieces.find((p) => p.id === leader.id).shadow).toBe(
        "lime",
      );
      expect(snapped.pieces.find((p) => p.id === neighbor.id).shadow).toBe(
        "lime",
      );
      const groupPoint = await hitPoint(page, leader.id);
      const before = snapped.pieces.find((p) => p.id === leader.id);
      await drag(page, groupPoint, { x: 25, y: 20 }, touch);
      snapped = await state(page);
      for (const id of [leader.id, neighbor.id]) {
        const piece = snapped.pieces.find((p) => p.id === id);
        expect(piece.x - before.x).toBeCloseTo(25 / initial.scale, 3);
        expect(piece.y - before.y).toBeCloseTo(20 / initial.scale, 3);
      }
      await page.screenshot({
        path: `test-results/puzzle-${puzzle}-${touch ? "touch" : "mouse"}.png`,
      });
      await page.reload();
      await expect
        .poll(async () =>
          (await state(page)).pieces.map((p) => ({ id: p.id, x: p.x, y: p.y })),
        )
        .toEqual(initial.pieces.map((p) => ({ id: p.id, x: p.x, y: p.y })));
      expect(errors).toEqual([]);
    });
  }
  test(`puzzle ${puzzle}: cross-origin iframe viewport and refresh`, async ({
    page,
  }) => {
    await page.goto("http://localhost:4173/marsha-puzzle/");
    await page.evaluate((puzzle) => {
      document.body.innerHTML = `<iframe title="Puzzle" style="border:0;width:640px;height:480px" src="http://127.0.0.1:4173/marsha-puzzle/?puzzle=${puzzle}"></iframe>`;
    }, puzzle);
    const frame = await (
      await page.locator("iframe").elementHandle()
    ).contentFrame();
    await expect(frame.locator("canvas")).toBeVisible();
    await expect.poll(async () => (await state(frame)).width).toBe(640);
    expect((await state(frame)).height).toBe(480);
    expect(await frame.locator("main").count()).toBe(0);
    for (const touch of [false, true]) {
      const before = await state(frame);
      const piece = before.pieces.find((p) => p.id === "path-0");
      const point = await hitPoint(frame, piece.id);
      const box = await page.locator("iframe").boundingBox();
      await drag(
        page,
        { x: box.x + point.x, y: box.y + point.y },
        { x: 15, y: 12 },
        touch,
      );
      await expect
        .poll(
          async () =>
            (await state(frame)).pieces.find((p) => p.id === piece.id).x,
        )
        .toBeCloseTo(piece.x + 15 / before.scale, 3);
    }
    await page.locator("iframe").evaluate((el) => {
      el.style.width = "375px";
      el.style.height = "667px";
    });
    await expect.poll(async () => (await state(frame)).width).toBe(375);
    expect((await state(frame)).height).toBe(667);
    await frame.goto(frame.url());
    await expect(frame.locator("canvas")).toBeVisible();
  });
}

test("landing links work under Pages subpath", async ({ page }) => {
  const failures = [];
  page.on("response", (response) => {
    if (response.status() >= 400) failures.push(response.url());
  });
  await page.goto("/marsha-puzzle/");
  await page.getByRole("link", { name: "Puzzle One" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  expect(page.url()).toContain("/marsha-puzzle/?puzzle=1");
  expect(failures).toEqual([]);
});
