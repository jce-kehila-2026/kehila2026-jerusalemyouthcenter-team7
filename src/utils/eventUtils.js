import { COLORS } from "../data/mockData";

export const getGroupColor = (groupName) => {
  if (groupName === "All Groups") return COLORS.teal;
  if (groupName === "Year 1") return COLORS.yellow;
  if (groupName === "Year 2") return COLORS.red;
  if (groupName === "Year 3") return "#8b5cf6";

  return COLORS.charcoal;
};

export const formatDate = (dateStr) => {
  const date = new Date(dateStr);

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};
