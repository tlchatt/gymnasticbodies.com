import { Appearance } from "@/data/Appearance.jsx";
let appearance = Appearance;
export function Colors(scheme) {
  //console.log("Colors called with scheme:", scheme);

  if (!scheme) {
    scheme == "unset";
  }
  const bgcolor =
    scheme == "primary"
      ? appearance.colorSchemes.PrimaryBackground :
      scheme == "secondary"
        ? appearance.colorSchemes.SecondaryBackground
        : scheme === "tertiary"
          ? appearance.colorSchemes.TertiaryBackground
          : scheme === "quaternary"
            ? appearance.colorSchemes.QuaternaryBackground
            : scheme === "senary"
              ? appearance.colorSchemes.SenaryBackground
              : "inherit"
  const fgcolor =
    scheme == "primary"
      ? appearance.colorSchemes.PrimaryForeground :
      scheme == "secondary"
        ? appearance.colorSchemes.SecondaryForeground
        : scheme === "tertiary"
          ? appearance.colorSchemes.TertiaryForeground
          : scheme === "quaternary"
            ? appearance.colorSchemes.QuaternaryForeground
            : scheme === "senary"
              ? appearance.colorSchemes.SenaryForeground
              : "inherit";
  const fgaccent =
    scheme == "primary"
      ? appearance.Accent.Primary.color :
      scheme === "secondary"
        ? appearance.Accent.Secondary.color
        : scheme === "tertiary"
          ? appearance.Accent.Tertiary.color
          : scheme === "quaternary"
            ? appearance.Accent.Quaternary.color
            : scheme === "senary"
              ? appearance.Accent.Senary.color
              : "inherit";

  return {
    bgcolor: bgcolor,
    fgcolor: fgcolor,
    fgaccent: fgaccent,
  };
}
