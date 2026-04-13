export type InAppNotificationInput = {
  title: string;
  body?: string;
  href?: string;
};

export type InAppNotificationHistoryEntry = InAppNotificationInput & {
  id: string;
  at: number;
  read: boolean;
};
