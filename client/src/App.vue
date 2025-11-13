<template>
	<div v-if="!loading" class="flex size-full bg-default-background h-screen overflow-hidden">
		<div class="min-w-[320px] grid grid-rows-[4fr_300px] flex-col bg-neutral-50 border-r border-neutral-border">
			<div class="flex-1 overflow-hidden">
				<div class="px-4 py-4 border-b border-neutral-border">
					<h2 class="text-caption-bold text-subtext-color uppercase tracking-wide">Channels</h2>
				</div>
				<div class="overflow-auto h-full">
					<RoomsBar />
				</div>
			</div>
			<div class="border-t border-neutral-border flex flex-col">
				<Me />
				<div class="px-4 py-3 border-b border-neutral-border">
					<h2 class="text-caption-bold text-subtext-color uppercase tracking-wide">Direct Messages</h2>
				</div>
				<div class="overflow-auto flex">
					<UserBar />
				</div>
			</div>
		</div>
		<div class="flex flex-col h-full flex-1 overflow-hidden">
			<div class="flex items-center px-6 h-12 border-b border-neutral-border bg-neutral-50 justify-between">
				<div class="flex gap-3 items-end">
					<h1 class="text-heading-3 font-semibold text-default-font">
						{{ state.selectedRoom?.name || "No room selected" }}
					</h1>
					<p class="text-default-font text-xs">{{ state.selectedRoom?.description }}</p>
				</div>
				<button
					@click="clearSession"
					class="text-xs text-subtext-color hover:cursor-pointer hover:text-brand-600 opacity-40 hover:opacity-100 px-2 py-1 rounded transition-all duration-200 hover:bg-neutral-200/50"
					title="Clear session and reload"
				>
					Clear session
				</button>
			</div>
			<div class="flex-1 overflow-hidden">
				<ChatBody :room="state.selectedRoom" />
			</div>
			<div class="border-t border-neutral-border bg-neutral-50 px-6 py-4">
				<Input />
			</div>
		</div>
	</div>
	<div v-else class="bg-default-background size-full flex justify-center items-center">
		<Loading />
	</div>
</template>

<script setup lang="ts">
import ChatBody from "@/components/ChatBody.vue";
import Input from "@/components/Input.vue";
import Loading from "@/components/Loading.vue";
import Me from "@/components/Me.vue";
import RoomsBar from "@/components/RoomsBar.vue";
import UserBar from "@/components/UserBar.vue";
import { auth, useAuth } from "@/service/auth";
import { chatState, notifications, state } from "@/state";
import { onBeforeMount, onUnmounted, ref } from "vue";
import type { DbUser } from "../../types";
import { socket } from "./service/socket";

const { clearSession, getAccessToken, install } = useAuth();

const loading = ref(false);

onBeforeMount(async () => {
	loading.value = true;
	await install();
	const newToken = await getAccessToken();
	if (newToken) {
		auth.token = newToken;
		socket.auth = {
			token: newToken,
		};
		if (!socket.connected) {
			socket.connect();
		}
	}

	const resp = await fetch("/api/token/me", {
		headers: {
			authorization: `Bearer ${auth.token}`,
		},
	});

	if (resp.ok) {
		const respInJson: DbUser = await resp.json();
		auth.user = respInJson;
	} else if (resp.status === 404) {
		clearSession();
	} else {
		auth.error = `Me problem: ${resp.status}`;
	}
	loading.value = false;
});

socket.on("message", (message) => {
	if (state.selectedRoom?.id === message.room) {
		chatState.addMessage(message);
	} else {
		notifications.notify(message.room);
	}
});

socket.on("hello", (connectedUsers) => {
	connectedUsers.forEach((id) => {
		state.connectedUser.set(id, null);
	});
});
socket.on("invite", (room) => {
	state.addRoom(room);
});
socket.on("leaveRoom", (room) => {
	state.removeRoom(room);
	state.selectRoom();
});

socket.on("userConnected", (newuser) => {
	state.connectedUser.set(newuser.id, null);
	state.users.set(newuser.id, newuser);
});

socket.on("userDisconnected", (userId) => {
	state.connectedUser.delete(userId);
});

onUnmounted(() => {
	socket.disconnect();
});
</script>

<style scoped></style>
