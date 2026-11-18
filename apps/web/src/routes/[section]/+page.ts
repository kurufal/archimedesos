import { error } from "@sveltejs/kit";
import { sections } from "$lib/mock";
export const entries = () =>
  sections
    .filter((section) => section !== "dashboard")
    .map((section) => ({ section }));
export const load = ({ params }: { params: { section: string } }) => {
  if (params.section === "dashboard" || !sections.includes(params.section))
    error(404, "Unknown section");
  return { section: params.section };
};
