<template>
	<div class="flex size-full overflow-y-auto flex-col-reverse p-4">
		<p v-if="error" class="text-error-600 p-5">{{ error }}</p>
		<ul v-else class="flex flex-col gap-2">
			<li
				v-for="item in chatState.messages"
				:key="item.id"
				class="flex gap-3 px-4 py-1 hover:bg-neutral-100/10 rounded-lg transition-colors"
			>
				<div
					class="w-10 h-10 rounded-lg flex items-center justify-center text-default-background font-semibold text-body"
					:class="[item.user_id === auth.user?.id ? 'bg-brand-600' : 'bg-neutral-300']"
				>
					{{ item.username?.charAt(0).toUpperCase() || "U" }}
				</div>
				<div class="flex-1 min-w-0">
					<div class="flex items-baseline gap-2 mb-1">
						<span class="text-body-bold text-neutral-900">{{ item.username || "Unknown" }}</span>
						<span class="text-caption text-default-font">{{
							new Date(item.created).toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							})
						}}</span>
					</div>
					<p class="text-body text-neutral-500 leading-relaxed whitespace-pre-wrap wrap-break-word">
						{{ item.content }}
					</p>
				</div>
			</li>
		</ul>
	</div>
</template>

<script setup lang="ts">
import { auth } from "@/service/auth";
import { useFetch } from "@/service/useFetch";
import { chatState, state } from "@/state";
import { computed, watch } from "vue";
import type { ChatMessage } from "../../../types";

const url = computed(() => `/api/chat/${state.selectedRoom?.id}`);

const { error, fetchData } = useFetch<ChatMessage[]>((res) => {
	chatState.messages = res;
});

watch(
	() => state.selectedRoom,
	() => {
		if (state.selectedRoom !== null) {
			fetchData(url.value);
		} else {
			chatState.clear();
		}
	},
	{ immediate: true }
);
</script>

<style scoped></style>
