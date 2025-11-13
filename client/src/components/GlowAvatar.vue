<template>
	<div class="size-8 font-semibold text-body rounded-full relative overflow-hidden flex justify-center items-center">
		<div
			class="animate-border absolute inset-0 bg-linear-to-r bg-size-[500%_500%]"
			:class="[
				props.variant === 'error'
					? 'from-[#ec441ae6] via-[#f5c7bf1a] to-[#e1d7b000]'
					: 'from-[#c2bb9be6] via-[#a39c791a] to-[#e1d7b000]',
			]"
		></div>
		<div class="z-20 flex rounded-full size-[94%] font-semibold text-body bg-neutral-300">
			<p
				class="flex-1 relative rounded-lg bg-transparent size-full flex text-default-font/60 justify-center items-center"
			>
				{{ props.initial || "U" }}
			</p>
		</div>
	</div>
</template>

<script setup lang="ts">
const props = defineProps(["initial", "variant"]);
</script>
