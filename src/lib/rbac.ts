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


