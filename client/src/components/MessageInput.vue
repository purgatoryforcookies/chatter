<template>
	<div class="w-full">
		<form v-on:submit="onSubmit" class="flex gap-2">
			<div class="flex-1">
				<input
					v-model="value"
					:placeholder="placeholder"
					class="w-full px-4 py-2 rounded-lg border border-neutral-border focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-transparent placeholder-neutral-300 text-neutral-500 bg-neutral-50"
					:disabled="loading"
					ref="input"
					autofocus
				/>
			</div>
			<button
				type="button"
				@click="onSubmit"
				:disabled="loading || value.length === 0"
				class="px-6 my-1 bg-brand-600 text-default-background rounded-lg text-body-bold hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:cursor-pointer"
			>
				Send
			</button>
		</form>
	</div>
</template>

<script setup lang="ts">
import { socket } from "@/service/socket";
import { chatState, state } from "@/state";
import { nextTick, ref, useTemplateRef, watch } from "vue";

const error = ref<null | string>();
const loading = ref<boolean>(false);
const value = ref("");
const input = useTemplateRef<HTMLInputElement>("input");

const placeholder = ref(`Write to #${state.selectedRoom?.name}`);

watch(
	() => state.selectedRoom,
	(room) => {
		placeholder.value = `Write to #${room?.name}`;
		input.value?.focus();
	}
);

const onSubmit = (e: SubmitEvent | PointerEvent) => {
	e.preventDefault();
	loading.value = true;
	const room = state?.selectedRoom?.id;
	if (value.value.length === 0) return;
	if (room && room.length > 0) {
		error.value = "";
		socket.emit("message", room, value.value, (message) => {
			loading.value = false;
			if (message) {
				chatState.addMessage(message);
				value.value = "";
				nextTick(() => {
					input.value?.focus();
				});
			} else {
				error.value = "No response from server";
			}
		});
	} else {
		error.value = "No room selected";
	}
};
</script>
