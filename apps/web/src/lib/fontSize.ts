import { Extension } from "@tiptap/core";

// Adds a `fontSize` attribute to the TextStyle mark, storing the size inline as
// `<span style="font-size: 24px">…</span>` so it round-trips through the saved HTML.
// Requires the TextStyle extension to be registered alongside it.

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      /** Apply a font size (e.g. "24px") to the current selection. */
      setFontSize: (size: string) => ReturnType;
      /** Clear any font size from the current selection. */
      unsetFontSize: () => ReturnType;
    };
  }
}

export const FontSize = Extension.create({
  name: "fontSize",

  addOptions() {
    return { types: ["textStyle"] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (size) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run(),
    };
  },
});
