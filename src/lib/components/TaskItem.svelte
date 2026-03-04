<script lang="ts">
    import type { TickTask } from "../types.js";
    import { appState } from "../stores.js";
    import { TickAPI } from "../api.js";

    interface Props {
        task: TickTask;
    }

    let { task = $bindable() }: Props = $props();

    let isDragging = $state(false);
    let isResizing = $state(false);
    let dragStartX = $state(0);
    let dragStartY = $state(0);
    let initialTop = $state(0);
    let initialHeight = $state(0);
    let taskElement = $state<HTMLElement | undefined>(undefined);

    let api = $derived(
        appState.authConfig ? new TickAPI(appState.authConfig) : null,
    );

    let position = $derived.by(() => {
        const startHour = parseInt(task.start_time.split(":")[0]);
        const startMinute = parseInt(task.start_time.split(":")[1]);
        const top = startHour * 60 + startMinute;
        const height = task.duration;

        return {
            top: `${top}px`,
            height: `${height}px`,
        };
    });

    function handleMouseDown(event: MouseEvent) {
        if (
            event.target instanceof HTMLElement &&
            event.target.classList.contains("resize-handle")
        ) {
            startResizing(event);
        } else {
            startDragging(event);
        }
    }

    function startDragging(event: MouseEvent) {
        isDragging = true;
        dragStartX = event.clientX;
        dragStartY = event.clientY;
        initialTop = parseInt(position.top);

        document.addEventListener("mousemove", handleDrag);
        document.addEventListener("mouseup", stopDragging);

        if (event.altKey || event.metaKey) {
            duplicateTask(event);
        }
    }

    function startResizing(event: MouseEvent) {
        event.stopPropagation();
        isResizing = true;
        dragStartY = event.clientY;
        initialHeight = task.duration;

        document.addEventListener("mousemove", handleResize);
        document.addEventListener("mouseup", stopResizing);
    }

    function handleDrag(event: MouseEvent) {
        if (!isDragging) return;

        const deltaY = event.clientY - dragStartY;
        const newTop = Math.max(0, initialTop + deltaY);
        const newHour = Math.floor(newTop / 60);
        const newMinute = newTop % 60;

        task.start_time = `${String(newHour).padStart(2, "0")}:${String(newMinute).padStart(2, "0")}`;

        updateTaskPosition();
    }

    function handleResize(event: MouseEvent) {
        if (!isResizing) return;

        const deltaY = event.clientY - dragStartY;
        const newHeight = Math.max(15, initialHeight + deltaY);

        task.duration = newHeight;

        const startHour = parseInt(task.start_time.split(":")[0]);
        const startMinute = parseInt(task.start_time.split(":")[1]);
        const endTotalMinutes = startHour * 60 + startMinute + newHeight;
        const endHour = Math.floor(endTotalMinutes / 60);
        const endMinute = endTotalMinutes % 60;

        task.end_time = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;

        updateTaskPosition();
    }

    function stopDragging() {
        if (isDragging) {
            isDragging = false;
            saveTask();
            document.removeEventListener("mousemove", handleDrag);
            document.removeEventListener("mouseup", stopDragging);
        }
    }

    function stopResizing() {
        if (isResizing) {
            isResizing = false;
            saveTask();
            document.removeEventListener("mousemove", handleResize);
            document.removeEventListener("mouseup", stopResizing);
        }
    }

    function duplicateTask(event: MouseEvent) {
        const newTask: TickTask = {
            ...task,
            id: `temp-${Date.now()}`,
            name: `${task.name} (Copy)`,
        };

        appState.tasks = [...appState.tasks, newTask];

        if (api) {
            api.createTask(newTask).then((createdTask) => {
                if (createdTask) {
                    appState.tasks = appState.tasks.map((t) =>
                        t.id === newTask.id ? createdTask : t,
                    );
                }
            });
        }
    }

    async function saveTask() {
        if (!api) return;

        const updatedTask = await api.updateTask(task.id, task);
        if (updatedTask) {
            appState.tasks = appState.tasks.map((t) =>
                t.id === task.id ? updatedTask : t,
            );
        }
    }

    function updateTaskPosition() {
        if (taskElement) {
            taskElement.style.top = position.top;
            taskElement.style.height = position.height;
        }
    }
</script>

<div
    bind:this={taskElement}
    class="task-item"
    class:dragging={isDragging}
    class:resizing={isResizing}
    style="top: {position.top}; height: {position.height}; background-color: {task.color ||
        '#3b82f6'};"
    onmousedown={handleMouseDown}
    role="button"
    tabindex="0"
>
    <div class="task-content">
        <div class="task-name">{task.name}</div>
        <div class="task-time">{task.start_time} - {task.end_time}</div>
    </div>
    <div class="resize-handle"></div>
</div>

<style>
    .task-item {
        position: absolute;
        left: 4px;
        right: 4px;
        border-radius: 4px;
        color: white;
        cursor: grab;
        user-select: none;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transition: transform 0.1s ease;
        z-index: 1;
    }

    .task-item:hover {
        transform: scale(1.02);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    }

    .task-item.dragging {
        cursor: grabbing;
        z-index: 10;
        transform: scale(1.05);
    }

    .task-item.resizing {
        z-index: 10;
    }

    .task-content {
        padding: 4px 8px;
        overflow: hidden;
        height: calc(100% - 8px);
        position: relative;
    }

    .task-name {
        font-size: 0.75rem;
        font-weight: 500;
        margin-bottom: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .task-time {
        font-size: 0.6rem;
        opacity: 0.8;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .resize-handle {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: rgba(255, 255, 255, 0.3);
        cursor: ns-resize;
        opacity: 0;
        transition: opacity 0.2s;
    }

    .task-item:hover .resize-handle {
        opacity: 1;
    }

    .resize-handle:hover {
        background: rgba(255, 255, 255, 0.5);
    }
</style>
