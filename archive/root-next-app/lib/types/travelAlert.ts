export type TravelCategory = "shuttle" | "parking" | "weather" | "advisory";

export type TravelShuttleStatus = "on-time" | "delayed";

export type TravelPriority = "high" | "normal";

export type TravelFilterTab = "all" | "shuttle" | "advisory" | "delayed";

export type TravelAlert = {
  id: string;
  category: TravelCategory;
  title: string;
  message: string;
  route?: string;
  location?: string;
  shuttleStatus?: TravelShuttleStatus;
  updatedLabel: string;
  priority: TravelPriority;
  sortIndex: number;
};
