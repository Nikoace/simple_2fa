import { useEffect, useRef, useState } from 'react';
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
} from '@mui/material';

export interface SelectableItem {
    name: string;
    issuer: string | null;
}

interface AccountSelectDialogProps {
    open: boolean;
    title: string;
    items: SelectableItem[];
    confirmLabel: string;
    /** 可选的额外内容区域（如策略选择器），显示在列表下方 */
    extra?: React.ReactNode;
    onConfirm: (selectedIndices: number[]) => void;
    onClose: () => void;
}

export default function AccountSelectDialog({
    open,
    title,
    items,
    confirmLabel,
    extra,
    onConfirm,
    onClose,
}: AccountSelectDialogProps) {
    const [checked, setChecked] = useState<boolean[]>([]);
    // ref 持有最新 items，避免 open effect 依赖 items 导致轮询刷新时重置用户选择
    const itemsRef = useRef(items);
    itemsRef.current = items;

    // 对话框打开时初始化为全选，关闭时清空
    // 不依赖 items，防止 5 秒轮询产生新引用时意外重置用户的手动选择
    useEffect(() => {
        if (open) {
            setChecked(itemsRef.current.map(() => true));
        } else {
            setChecked([]);
        }
    }, [open]);

    const selectedCount = checked.filter(Boolean).length;
    const allSelected = selectedCount === items.length && items.length > 0;
    const someSelected = selectedCount > 0 && selectedCount < items.length;

    const toggleAll = () => {
        setChecked(items.map(() => !allSelected));
    };

    const toggleItem = (index: number) => {
        setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)));
    };

    const handleConfirm = () => {
        const selectedIndices = checked
            .map((v, i) => (v ? i : -1))
            .filter((i) => i >= 0);
        onConfirm(selectedIndices);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent sx={{ p: 0 }}>
                {/* 全选 */}
                <List dense disablePadding>
                    <ListItem disablePadding>
                        <ListItemButton onClick={toggleAll} dense>
                            <ListItemIcon>
                                <Checkbox
                                    checked={allSelected}
                                    indeterminate={someSelected}
                                    tabIndex={-1}
                                    disableRipple
                                />
                            </ListItemIcon>
                            <ListItemText
                                primary={allSelected ? '取消全选' : '全选'}
                                slotProps={{ primary: { fontWeight: 'bold' } }}
                            />
                        </ListItemButton>
                    </ListItem>
                    <Divider />
                    {items.map((item, index) => (
                        <ListItem key={index} disablePadding>
                            <ListItemButton onClick={() => toggleItem(index)} dense>
                                <ListItemIcon>
                                    <Checkbox
                                        checked={checked[index] ?? false}
                                        tabIndex={-1}
                                        disableRipple
                                    />
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.issuer || '(无 Issuer)'}
                                    secondary={item.name}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
                {extra && (
                    <>
                        <Divider />
                        <div style={{ padding: '8px 16px 4px' }}>{extra}</div>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>取消</Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={selectedCount === 0}
                >
                    {confirmLabel}（{selectedCount} 项）
                </Button>
            </DialogActions>
        </Dialog>
    );
}
