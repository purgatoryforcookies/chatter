<template>
	<div class="text-default-font">
		<div v-if="loading" class="p-1 animate-pulse">Loading</div>
		<div v-else class="w-full">
			<ul class="py-2 flex flex-col w-full">
				<li
					:key="item.id"
					v-for="item in state.rooms.values()"
					class="px-4 py-1.5 flex justify-between text-body hover:cursor-pointer hover:bg-neutral-100 hover:text-brand-600 transition-colors rounded-md mx-2"
					:class="[state.selectedRoom?.id === item.id ? 'bg-neutral-100 text-brand-600' : '']"
				>
					<div class="flex gap-4 w-full" @click="state.selectRoom(item.id)">
						<span :class="[item.private ? 'text-orange-600' : '']">#{{ item.name }}</span>
						<span
							v-if="notifications.unread.has(item.id)"
							class="text-xs aspect-square flex justify-center items-center pt-px"
							>{{ notifications.unread.get(item.id) }}</span
						>
					</div>
					<span
						@click="() => deleteRoom(item.id)"
						class="hover:scale-110 hover:text-red-600 text-default-font/50 transition-opacity"
						>X</span
					>
				</li>
			</ul>
			<div v-if="error" class="p-1">{{ error }}</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { auth } from "@/service/auth";
import { useFetch } from "@/service/useFetch";
import { notifications, state } from "@/state";
import { onMounted } from "vue";
import type { DbRoom } from "../../../types";

const { loading, error, fetchData } = useFetch<DbRoom[]>((resp) => {
	if (resp) {
		resp.forEach((room, i) => {
			state.rooms.set(room.id, room);
			if (i === 0) state.selectRoom(room.id);
		});
	}
});

const deleteRoom = async (id: string) => {
	try {
		error.value = null;
		if (!auth.token) {
			error.value = "No token!";
			return;
		}
		const resp = await fetch("/api/room/" + id, {
			method: "delete",
			headers: {
				authorization: auth.token,
			},
		});
		if (resp.ok) {
			state.removeRoom(id);
		} else {
			error.value = `Cannot delete room ${resp.status}`;
		}
	} catch (err) {
		console.log(err);
		error.value = "Cannot delete room";
	}
	setTimeout(() => {
		error.value = null;
	}, 2000);
};

onMounted(() => {
	fetchData("/api/room");
});
</script>
