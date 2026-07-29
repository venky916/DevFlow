import { useRef } from "react";
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { MentionList, type MentionListRef } from "@devflow/ui/components/mention-list";
import { useProjectMembers } from "./use-project-settings";

export function useMentionSuggestion(projectId: string) {
    const { data: members } = useProjectMembers(projectId);
    const membersRef = useRef<{ id: string; label: string }[]>([]);

    membersRef.current = (members ?? []).map((m: any) => ({
        id: m.user?.id ?? m.userId,
        label: m.user?.name ?? "Unknown",
    }));

    return {
        items: ({ query }: { query: string }) =>
            membersRef.current
                .filter((m) => m.label.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 8),

        render: () => {
            let component: ReactRenderer<MentionListRef>;
            let popup: TippyInstance[] = [];   // ← starts as an empty array, never undefined

            return {
                onStart: (props: any) => {
                    component = new ReactRenderer<MentionListRef, any>(MentionList, {
                        props,
                        editor: props.editor,
                    });
                    if (!props.clientRect) return;

                    popup = tippy("body", {
                        getReferenceClientRect: props.clientRect,
                        appendTo: () => document.body,
                        content: component.element,
                        showOnCreate: true,
                        interactive: true,
                        trigger: "manual",
                        placement: "bottom-start",
                    });
                },
                onUpdate: (props: any) => {
                    component.updateProps(props);
                    if (!props.clientRect) return;
                    popup[0]?.setProps({ getReferenceClientRect: props.clientRect });
                },
                onKeyDown: (props: any) => {
                    if (props.event.key === "Escape") {
                        popup[0]?.hide();
                        return true;
                    }
                    return component.ref?.onKeyDown(props) ?? false;
                },
                onExit: () => {
                    popup[0]?.destroy();
                    component.destroy();
                },
            };
        },
    };
}