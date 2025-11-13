import { reactive } from "vue";
import type { ChatMessage, DbRoom, DbUser } from "../../types";

export type DbUserWithStatus = DbUser & { online: boolean };

export const state = reactive<{
	connected: boolean;
	users: Map<string, DbUser>;
	connectedUser: Map<string, null>;
	rooms: Map<string, DbRoom>;
	selectedRoom: DbRoom | null;
	selectRoom: (id?: string) => void;
	addRoom: (room: DbRoom) => void;
	removeRoom: (id: string) => void;
}>({
	connected: false,
	selectedRoom: null,
	users: new Map(),
	connectedUser: new Map(),
	rooms: new Map(),
	async selectRoom(id?: string) {
		if (!id) {
			this.selectedRoom = null;
			return;
		}
		const room = this.rooms.get(id);
		if (room) {
			this.selectedRoom = room;
			notifications.clear(id);
		}
	},
	addRoom(room) {
		this.rooms.set(room.id, room);
	},
	removeRoom(id: string) {
		this.rooms.delete(id);
		this.selectRoom();
	},
});

export const chatState = reactive<{
	loading: boolean;
	messages: ChatMessage[];
	addMessage: (message: ChatMessage) => void;
}>({
	loading: false,
	messages: [],
	addMessage(message) {
		this.messages.push(message);
	},
});

export const notifications = reactive<{
	unread: Map<string, number>;
	notify: (id: string) => void;
	clear: (id: string) => void;
}>({
	unread: new Map(),
	notify(id) {
		const existingCount = this.unread.get(id);

		if (!existingCount) {
			this.unread.set(id, 1);
		} else {
			this.unread.set(id, existingCount + 1);
		}
	},
	clear(id: string) {
		this.unread.delete(id);
	},
});
