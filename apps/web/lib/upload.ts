export async function uploadFileToStorage(uploadUrl: string, file: File): Promise<void> {
    const res = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
    });
    if (!res.ok) throw new Error('Upload to storage failed');
}