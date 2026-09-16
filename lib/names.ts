/**
 * How a customer's name is written down.
 *
 * People type their name into a phone keyboard in a hurry: "vicky manora",
 * "VICKY MANORA", "  vicky   manora ". All three are the same person and all
 * three should read as "Vicky Manora" — on the order, in the WhatsApp
 * message and on the admin screen, which is where staff read a name aloud.
 *
 * Deliberately conservative about case it did not have to fix. A word that
 * is already mixed-case was typed that way on purpose — McKenna, DeSouza,
 * D'Souza — so only the all-lower and all-upper spellings are rewritten.
 * Guessing at particles ("van der", "de la") would do more harm than good
 * for a dessert cart in Aundh, so no list of them is kept.
 */
export function properName(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map(capitaliseWord)
    .join(" ");
}

/** hyphens, apostrophes and dots all start a new part of a name */
function capitaliseWord(word: string): string {
  return word
    .split(/([-'’.])/)
    .map((part) => {
      if (part === "" || /^[-'’.]$/.test(part)) return part;

      const settled =
        part === part.toLowerCase() || part === part.toUpperCase()
          ? part.toLowerCase()
          : part;

      return settled.charAt(0).toUpperCase() + settled.slice(1);
    })
    .join("");
}
