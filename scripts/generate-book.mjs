import { writeFileSync } from "node:fs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const cream = rgb(0.953, 0.937, 0.902);
const ink = rgb(0.102, 0.09, 0.078);
const muted = rgb(0.35, 0.32, 0.28);
const forest = rgb(0.247, 0.435, 0.392);
const rule = rgb(0.78, 0.74, 0.68);

const chapters = [
  {
    title: "On Looking Closely",
    paragraphs: [
      "The first skill of a reader is not speed. It is attention. A sentence can hide a whole weather system if you let your eye rest on it long enough.",
      "When you select a line and turn it into another language, you are not merely swapping words. You are asking how a thought would stand if it had grown up in a different house.",
      "Persian and English do not always keep the same furniture. One language may prefer a verb at the end of the room; the other may put it near the door. Translation is the art of moving through both rooms without knocking things over.",
      "Try a small experiment. Highlight this paragraph. Send it across. Then read the new version aloud. Notice which images survive, and which ones change their clothes.",
    ],
  },
  {
    title: "A Walk in the Old City",
    paragraphs: [
      "At dawn the alleys are still cool. Bread is being pulled from the oven, and the smell of yeast and woodsmoke hangs in the street like a soft curtain.",
      "A shopkeeper rolls up a metal shutter. Copper pans catch the first light. A cat claims the warm stone of a doorstep and refuses to negotiate.",
      "You can learn a city by its morning sounds: a bicycle bell, a radio playing an old song, someone calling a name from a balcony. None of these things are spectacular. Together they make a place feel inhabited.",
      "If you were to describe this hour to a friend who has never been here, which details would you keep? The steam from the tea, the dust on the windowsill, the way the shadows are still long and blue?",
      "Good writing, like a good walk, does not hurry. It lets the reader arrive at the corner a moment after you do.",
    ],
  },
  {
    title: "The Measure of a Day",
    paragraphs: [
      "We pretend that time is a straight road. In practice it behaves more like water. Some hours pool. Some hours rush through a narrow channel and are gone before we can name them.",
      "A student waiting for an exam lives in a long afternoon. A traveler watching the last light on a mountain lives in a minute that feels larger than the calendar.",
      "Clocks are useful, but they are not honest about feeling. That is why people still say 'a short winter' or 'an endless night' even though both contain the same number of hours.",
      "When you translate a sentence about time, be careful. Words such as soon, later, and forever do not weigh the same in every language. Carry them gently.",
    ],
  },
  {
    title: "Tools and Hands",
    paragraphs: [
      "A pencil is a very old piece of technology. It does not ring. It does not ask for a password. It only records the pressure of a thought.",
      "Still, new tools can be loyal companions if we refuse to let them think for us. A translation engine is like a lamp: it shows the room, but it does not choose where you sit.",
      "The danger is not the lamp. The danger is forgetting that you have eyes.",
      "Use this book as a practice ground. Select a phrase. Compare the original with the version that appears beside it. Ask what was gained and what was smoothed away. That question is the beginning of real reading.",
      "Every craft has this double motion: trust the tool, then check the work with your own hands.",
    ],
  },
  {
    title: "A Note to the Traveler",
    paragraphs: [
      "If you are far from home, even a simple sentence can feel like a letter. Names of trees, kinds of rain, the taste of a fruit in season — these are small doors back into a life you know.",
      "Learning another language does not erase the first one. It gives you a second window in the same house. From one window you see the courtyard. From the other you see the road.",
      "Keep both windows open. Let the air move.",
      "This little book ends here, but the habit it asks for does not. Select, translate, compare, and return. The page will wait.",
      "May your next sentence be clearer than the one before it.",
    ],
  },
];

function wrap(text, font, size, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines;
}

async function main() {
  const pdf = await PDFDocument.create();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  const pageWidth = 396;
  const pageHeight = 612;
  const marginX = 48;
  const marginTop = 54;
  const maxText = pageWidth - marginX * 2;

  function paintPage(page) {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: cream,
    });
  }

  function footer(page, n) {
    page.drawLine({
      start: { x: marginX, y: 36 },
      end: { x: pageWidth - marginX, y: 36 },
      thickness: 0.4,
      color: rule,
    });
    const label = String(n);
    const w = serif.widthOfTextAtSize(label, 9);
    page.drawText(label, {
      x: (pageWidth - w) / 2,
      y: 22,
      size: 9,
      font: serif,
      color: muted,
    });
  }

  const title = pdf.addPage([pageWidth, pageHeight]);
  paintPage(title);
  title.drawRectangle({
    x: marginX,
    y: pageHeight - 92,
    width: 36,
    height: 3,
    color: forest,
  });
  title.drawText("TARJOMAAN", {
    x: marginX,
    y: pageHeight - 120,
    size: 11,
    font: serif,
    color: forest,
  });
  const bookTitle = "A Little Book";
  title.drawText(bookTitle, {
    x: marginX,
    y: pageHeight - 168,
    size: 28,
    font: serifBold,
    color: ink,
  });
  title.drawText("of Sentences", {
    x: marginX,
    y: pageHeight - 202,
    size: 28,
    font: serifBold,
    color: ink,
  });
  title.drawText("Sample pages for reading and translation.", {
    x: marginX,
    y: pageHeight - 236,
    size: 12,
    font: serifItalic,
    color: muted,
  });

  const intro = wrap(
    "Select any passage with your pointer. A translation can appear beside the page, over the line, or in a small floating card. The original English is meant to be ordinary and clear, so that you can judge the result.",
    serif,
    12,
    maxText,
  );
  let iy = pageHeight - 290;
  for (const line of intro) {
    title.drawText(line, { x: marginX, y: iy, size: 12, font: serif, color: ink });
    iy -= 18;
  }
  title.drawText("Keep this file next to the reader as book.pdf.", {
    x: marginX,
    y: 72,
    size: 10,
    font: serifItalic,
    color: muted,
  });
  footer(title, 1);

  let pageNumber = 2;
  for (const chapter of chapters) {
    const page = pdf.addPage([pageWidth, pageHeight]);
    paintPage(page);
    page.drawRectangle({
      x: marginX,
      y: pageHeight - marginTop - 4,
      width: 22,
      height: 2,
      color: forest,
    });
    page.drawText(chapter.title, {
      x: marginX,
      y: pageHeight - marginTop - 28,
      size: 16,
      font: serifBold,
      color: ink,
    });

    let y = pageHeight - marginTop - 56;
    for (const para of chapter.paragraphs) {
      const lines = wrap(para, serif, 11.5, maxText);
      if (y - lines.length * 16 - 14 < 52) break;
      for (const line of lines) {
        page.drawText(line, {
          x: marginX,
          y,
          size: 11.5,
          font: serif,
          color: ink,
        });
        y -= 16;
      }
      y -= 12;
    }
    footer(page, pageNumber);
    pageNumber += 1;
  }

  const bytes = await pdf.save();
  writeFileSync("/workspace/public/book.pdf", bytes);
  console.log("wrote public/book.pdf", bytes.length, "bytes", "pages", pageNumber - 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
