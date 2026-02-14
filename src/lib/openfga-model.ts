import type { WriteAuthorizationModelRequest } from '@openfga/sdk';

/**
 * OpenFGA authorization model in JSON format.
 * This should match openfga/model.fga — update both when changing the model.
 * To re-upload after changes, run: make setup
 */
export const AUTHORIZATION_MODEL: WriteAuthorizationModelRequest = {
  schema_version: '1.1',
  type_definitions: [
    { type: 'user' },
    {
      type: 'organization',
      relations: {
        member: { this: {} },
        top_folder: { this: {} },
      },
      metadata: {
        relations: {
          member: { directly_related_user_types: [{ type: 'user' }] },
          top_folder: { directly_related_user_types: [{ type: 'folder' }] },
        },
      },
    },
    {
      type: 'group',
      relations: {
        in_org: { this: {} },
        member: { this: {} },
        top_folder: { this: {} },
      },
      metadata: {
        relations: {
          in_org: { directly_related_user_types: [{ type: 'organization' }] },
          member: { directly_related_user_types: [{ type: 'user' }] },
          top_folder: { directly_related_user_types: [{ type: 'folder' }] },
        },
      },
    },
    {
      type: 'folder',
      relations: {
        parent: { this: {} },
        in_org: { this: {} },
        manager: { this: {} },
        editor: { this: {} },
        creator: { this: {} },
        viewer: { this: {} },
        manager_inherited: { union: { child: [{ computedUserset: { relation: 'manager' } }, { tupleToUserset: { tupleset: { relation: 'parent' }, computedUserset: { relation: 'manager_inherited' } } }] } },
        editor_inherited: { union: { child: [{ computedUserset: { relation: 'editor' } }, { tupleToUserset: { tupleset: { relation: 'parent' }, computedUserset: { relation: 'editor_inherited' } } }] } },
        viewer_inherited: { union: { child: [{ computedUserset: { relation: 'viewer' } }, { tupleToUserset: { tupleset: { relation: 'parent' }, computedUserset: { relation: 'viewer_inherited' } } }] } },
        can_view: { union: { child: [{ computedUserset: { relation: 'manager_inherited' } }, { computedUserset: { relation: 'editor_inherited' } }, { computedUserset: { relation: 'creator' } }, { computedUserset: { relation: 'viewer_inherited' } }] } },
        can_create: { union: { child: [{ computedUserset: { relation: 'manager_inherited' } }, { computedUserset: { relation: 'editor_inherited' } }, { computedUserset: { relation: 'creator' } }] } },
        can_edit: { union: { child: [{ computedUserset: { relation: 'manager_inherited' } }, { computedUserset: { relation: 'editor_inherited' } }] } },
        can_duplicate: { computedUserset: { relation: 'can_edit' } },
        can_remove: { computedUserset: { relation: 'manager_inherited' } },
        can_set_visibility: { computedUserset: { relation: 'manager_inherited' } },
        can_lock: { computedUserset: { relation: 'manager_inherited' } },
        can_view_effective: { intersection: { child: [{ computedUserset: { relation: 'can_view' } }, { tupleToUserset: { tupleset: { relation: 'in_org' }, computedUserset: { relation: 'member' } } }] } },
        can_create_effective: { intersection: { child: [{ computedUserset: { relation: 'can_create' } }, { tupleToUserset: { tupleset: { relation: 'in_org' }, computedUserset: { relation: 'member' } } }] } },
        can_edit_effective: { intersection: { child: [{ computedUserset: { relation: 'can_edit' } }, { tupleToUserset: { tupleset: { relation: 'in_org' }, computedUserset: { relation: 'member' } } }] } },
        can_duplicate_effective: { intersection: { child: [{ computedUserset: { relation: 'can_duplicate' } }, { tupleToUserset: { tupleset: { relation: 'in_org' }, computedUserset: { relation: 'member' } } }] } },
        can_remove_effective: { intersection: { child: [{ computedUserset: { relation: 'can_remove' } }, { tupleToUserset: { tupleset: { relation: 'in_org' }, computedUserset: { relation: 'member' } } }] } },
        can_set_visibility_effective: { intersection: { child: [{ computedUserset: { relation: 'can_set_visibility' } }, { tupleToUserset: { tupleset: { relation: 'in_org' }, computedUserset: { relation: 'member' } } }] } },
        can_lock_effective: { intersection: { child: [{ computedUserset: { relation: 'can_lock' } }, { tupleToUserset: { tupleset: { relation: 'in_org' }, computedUserset: { relation: 'member' } } }] } },
      },
      metadata: {
        relations: {
          parent: { directly_related_user_types: [{ type: 'folder' }] },
          in_org: { directly_related_user_types: [{ type: 'organization' }] },
          manager: { directly_related_user_types: [{ type: 'user' }, { type: 'group', relation: 'member' }] },
          editor: { directly_related_user_types: [{ type: 'user' }, { type: 'group', relation: 'member' }] },
          creator: { directly_related_user_types: [{ type: 'user' }, { type: 'group', relation: 'member' }] },
          viewer: { directly_related_user_types: [{ type: 'user' }, { type: 'group', relation: 'member' }] },
        },
      },
    },
    {
      type: 'document',
      relations: {
        parent: { this: {} },
        in_org: { this: {} },
        manager: { this: {} },
        editor: { this: {} },
        creator: { this: {} },
        viewer: { this: {} },
        shared_with: { this: {} },
        manager_inherited: { union: { child: [{ computedUserset: { relation: 'manager' } }, { tupleToUserset: { tupleset: { relation: 'parent' }, computedUserset: { relation: 'manager_inherited' } } }] } },
        editor_inherited: { union: { child: [{ computedUserset: { relation: 'editor' } }, { tupleToUserset: { tupleset: { relation: 'parent' }, computedUserset: { relation: 'editor_inherited' } } }] } },
        viewer_inherited: { union: { child: [{ computedUserset: { relation: 'viewer' } }, { tupleToUserset: { tupleset: { relation: 'parent' }, computedUserset: { relation: 'viewer_inherited' } } }] } },
        can_view: { union: { child: [{ computedUserset: { relation: 'manager_inherited' } }, { computedUserset: { relation: 'editor_inherited' } }, { computedUserset: { relation: 'creator' } }, { computedUserset: { relation: 'viewer_inherited' } }, { computedUserset: { relation: 'shared_with' } }] } },
        can_create: { union: { child: [{ computedUserset: { relation: 'manager_inherited' } }, { computedUserset: { relation: 'editor_inherited' } }, { computedUserset: { relation: 'creator' } }] } },
        can_edit: { union: { child: [{ computedUserset: { relation: 'manager_inherited' } }, { computedUserset: { relation: 'editor_inherited' } }] } },
        can_duplicate: { computedUserset: { relation: 'can_edit' } },
        can_remove: { computedUserset: { relation: 'manager_inherited' } },
        can_set_visibility: { computedUserset: { relation: 'manager_inherited' } },
        can_lock: { computedUserset: { relation: 'manager_inherited' } },
        can_view_effective: { intersection: { child: [{ computedUserset: { relation: 'can_view' } }, { tupleToUserset: { tupleset: { relation: 'in_org' }, computedUserset: { relation: 'member' } } }] } },
        can_create_effective: { intersection: { child: [{ computedUserset: { relation: 'can_create' } }, { tupleToUserset: { tupleset: { relation: 'in_org' }, computedUserset: { relation: 'member' } } }] } },
        can_edit_effective: { intersection: { child: [{ computedUserset: { relation: 'can_edit' } }, { tupleToUserset: { tupleset: { relation: 'in_org' }, computedUserset: { relation: 'member' } } }] } },
        can_duplicate_effective: { intersection: { child: [{ computedUserset: { relation: 'can_duplicate' } }, { tupleToUserset: { tupleset: { relation: 'in_org' }, computedUserset: { relation: 'member' } } }] } },
        can_remove_effective: { intersection: { child: [{ computedUserset: { relation: 'can_remove' } }, { tupleToUserset: { tupleset: { relation: 'in_org' }, computedUserset: { relation: 'member' } } }] } },
        can_set_visibility_effective: { intersection: { child: [{ computedUserset: { relation: 'can_set_visibility' } }, { tupleToUserset: { tupleset: { relation: 'in_org' }, computedUserset: { relation: 'member' } } }] } },
        can_lock_effective: { intersection: { child: [{ computedUserset: { relation: 'can_lock' } }, { tupleToUserset: { tupleset: { relation: 'in_org' }, computedUserset: { relation: 'member' } } }] } },
      },
      metadata: {
        relations: {
          parent: { directly_related_user_types: [{ type: 'folder' }] },
          in_org: { directly_related_user_types: [{ type: 'organization' }] },
          manager: { directly_related_user_types: [{ type: 'user' }, { type: 'group', relation: 'member' }] },
          editor: { directly_related_user_types: [{ type: 'user' }, { type: 'group', relation: 'member' }] },
          creator: { directly_related_user_types: [{ type: 'user' }, { type: 'group', relation: 'member' }] },
          viewer: { directly_related_user_types: [{ type: 'user' }, { type: 'group', relation: 'member' }] },
          shared_with: { directly_related_user_types: [{ type: 'user' }] },
        },
      },
    },
  ],
};
