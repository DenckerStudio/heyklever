export type Role = 'owner' | 'admin' | 'member' | 'viewer';

export const roleRank: Record<Role, number> = {
	owner: 4,
	admin: 3,
	member: 2,
	viewer: 1,
};

export function canPerform(required: Role, actual: Role) {
	return roleRank[actual] >= roleRank[required];
}

export type Permission =
	| 'team.delete'
	| 'team.settings.edit'
	| 'team.members.manage'
	| 'team.members.invite'
	| 'team.integrations.manage'
	| 'team.billing.manage'
	| 'files.upload'
	| 'files.delete'
	| 'files.visibility.edit'
	| 'files.download'
	| 'files.view'
	| 'chat.use'
	| 'train-ai.manage'
	| 'analytics.view'
	| 'client-urls.manage'
	| 'admin.panel';

const PERMISSION_MAP: Record<Permission, Role> = {
	'team.delete':               'owner',
	'team.settings.edit':        'admin',
	'team.members.manage':       'admin',
	'team.members.invite':       'admin',
	'team.integrations.manage':  'admin',
	'team.billing.manage':       'admin',
	'files.upload':              'member',
	'files.delete':              'admin',
	'files.visibility.edit':     'admin',
	'files.download':            'member',
	'files.view':                'viewer',
	'chat.use':                  'viewer',
	'train-ai.manage':           'admin',
	'analytics.view':            'viewer',
	'client-urls.manage':        'admin',
	'admin.panel':               'owner',
};

export function hasPermission(permission: Permission, role: Role): boolean {
	const required = PERMISSION_MAP[permission];
	return canPerform(required, role);
}

export function getPermissions(role: Role): Permission[] {
	return (Object.keys(PERMISSION_MAP) as Permission[]).filter(
		(p) => hasPermission(p, role)
	);
}

export const ROLE_LABELS: Record<Role, string> = {
	owner: 'Owner',
	admin: 'Admin',
	member: 'Member',
	viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
	owner: 'Full control including team deletion and billing',
	admin: 'Manage members, settings, integrations, and content',
	member: 'Upload files, use chat, and view analytics',
	viewer: 'Read-only access to files, chat, and analytics',
};
