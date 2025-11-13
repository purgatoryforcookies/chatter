<template>
	<div class="w-full border-t border-neutral-border bg-neutral-100">
		<div v-if="auth.error" class="flex items-center gap-3 px-3 py-2.5 bg-error-50/30 border-l-2 border-error-500">
			<div class="w-8 h-8 rounded-full bg-error-500/20 flex items-center justify-center">
				<GlowAvatar initial="!" variant="error" />
			</div>
			<div class="flex-1 min-w-0">
				<p class="text-caption-bold text-error-600 mb-0.5">Authentication Error</p>
				<p class="text-caption text-error-700/80 truncate">{{ auth.error }}</p>
			</div>
			<button
				@click="clearSession"
				class="px-3 py-1.5 text-caption hover:cursor-pointer text-error-50 bg-error-600 hover:bg-error-800 rounded-md transition-colors"
			>
				Retry
			</button>
		</div>

		<div v-else-if="auth.loading" class="flex items-center justify-between px-3 py-2.5 gap-2">
			<div class="flex items-center gap-2 flex-1 min-w-0">
				<div class="w-8 h-8 rounded-full bg-neutral-300 flex items-center justify-center animate-pulse">
					<span class="text-caption text-neutral-500">...</span>
				</div>
				<div class="flex-1 min-w-0">
					<p class="text-body-bold text-subtext-color truncate">Loading...</p>
					<p class="text-caption text-subtext-color truncate opacity-50">Checking</p>
				</div>
			</div>
			<div class="px-3 py-1.5 text-caption text-subtext-color opacity-50">
				<span class="invisible">Log out</span>
			</div>
		</div>

		<div
			v-else-if="auth.user"
			class="flex items-center justify-between px-3 py-2.5 gap-2 border-l-2 border-success-500"
		>
			<div class="flex items-center gap-2 flex-1 min-w-0">
				<GlowAvatar :initial="auth.user?.username?.charAt(0).toUpperCase()" />
				<div class="flex-1 min-w-0">
					<p class="text-body-bold text-default-font truncate">
						{{ auth.user?.username }}
					</p>
					<p class="text-caption text-subtext-color truncate">Online</p>
				</div>
			</div>
			<button
				@click="logout"
				v-if="auth.user.type === 'normal'"
				class="px-3 py-1.5 hover:cursor-pointer text-caption text-subtext-color hover:text-default-font hover:bg-neutral-200 rounded-md transition-colors"
			>
				Log out
			</button>
			<button
				@click="login"
				v-else
				class="px-3 py-1.5 text-caption hover:cursor-pointer text-default-font bg-brand-500 hover:bg-brand-400 rounded-md transition-colors"
			>
				Log in
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { auth, useAuth } from "@/service/auth";
import GlowAvatar from "./GlowAvatar.vue";

const { login, logout, clearSession } = useAuth();
</script>
