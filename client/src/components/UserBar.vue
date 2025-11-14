<template>
	<div class="text-default-font w-full">
		<div v-if="loading" class="p-1 animate-pulse">Loading</div>
		<div v-else>
			<ul class="py-2 flex flex-col w-full h-full">
				<li
					:key="item.id"
					v-for="item in [...state.users.values()]
						.filter((i) => i.id !== auth.user?.id)
						.sort((a, b) => Number(state.connectedUser.has(b.id)) - Number(state.connectedUser.has(a.id)))"
					class="px-4 py-1.5 text-body hover:bg-neutral-100 hover:cursor-pointer hover:text-brand-600 transition-colors rounded-md mx-2"
				>
					<div @click="() => createRoom(item.id, item.username)">
						<span
							class="inline-block w-2 h-2 rounded-full mr-2"
							:class="[state.connectedUser.has(item.id) ? 'bg-success-600' : 'bg-amber-600']"
						></span
						>{{ item.username }}
					</div>
				</li>
			</ul>
		</div>
		<div v-if="error" class="p-1 justify-self-center">{{ error }}</div>
	</div>
</template>

<script setup lang="ts">
import { auth } from "@/service/auth";
import { useFetch } from "@/service/useFetch";
import { state } from "@/state";
import { onMounted } from "vue";
import type { DbRoom, DbUser } from "../../../types";

const { fetchData, loading, error } = useFetch<DbUser[]>((resp) => {
	resp.forEach((u) => {
		state.users.set(u.id, u);
	});
});

const createRoom = async (participant: string, name: string) => {
	try {
		error.value = "";
		if (!auth.token) {
			error.value = "Cannot create room!";
			return;
		}
		const response = await fetch("/api/room", {
			method: "post",
			headers: {
				authorization: auth.token,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				name: `DM from ${auth.user?.username}`,
				description: `Private chat with ${name} and ${auth.user?.username}`,
				participants: [participant],
			}),
		});

		if (response.ok) {
			const newRoom: DbRoom = await response.json();
			state.addRoom(newRoom);
			state.selectRoom(newRoom.id);
		} else {
			error.value = `Cannot create room! - ${response.status}`;
			setTimeout(() => {
				window.location.reload();
			}, 3000);
		}
	} catch {
		error.value = `Cannot create room!`;
	}
};

onMounted(() => {
	fetchData("/api/user");
});
</script>
