export interface Organization {
  id: string;
  name: string;
  root_folder_id: string;
}

export type UserRole = 'admin' | 'coadmin' | 'member' | 'limited member';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface UserOrganization {
  user_id: string;
  organization_id: string;
  role: UserRole;
}

export interface UserWithOrganizations extends User {
  organizations: Array<{
    id: string;
    name: string;
    role: UserRole;
  }>;
}

export interface Group {
  id: string;
  name: string;
  organization_id: string;
}

export interface GroupUser {
  group_id: string;
  user_id: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  organization_id: string;
}

export interface Kahoot {
  id: string;
  name: string;
  folder_id: string;
}
