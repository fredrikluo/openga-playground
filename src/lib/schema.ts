export interface Organization {
  id: number;
  name: string;
  root_folder_id: number;
}

export type UserRole = 'admin' | 'coadmin' | 'member' | 'limited member';

export interface User {
  id: number;
  name: string;
  email: string;
  organization_id: number;
  role: UserRole;
}

export interface Group {
  id: number;
  name: string;
  organization_id: number;
}

export interface GroupUser {
  group_id: number;
  user_id: number;
}

export interface Folder {
  id: number;
  name: string;
  parent_folder_id: number | null;
  organization_id: number;
}

export interface Kahoot {
  id: number;
  name: string;
  folder_id: number;
}