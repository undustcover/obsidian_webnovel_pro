export interface StoryCodeInput {
	partNo?: number;
	volumeNo?: number;
	unitNo?: number;
	chapterNo: number;
}

export class StoryCodeService {
	compute(input: StoryCodeInput): string {
		const segments: string[] = [];
		if (Number.isInteger(input.partNo) && Number(input.partNo) > 0) segments.push(`P${String(input.partNo).padStart(2, '0')}`);
		if (Number.isInteger(input.volumeNo) && Number(input.volumeNo) > 0) segments.push(`V${String(input.volumeNo).padStart(2, '0')}`);
		if (Number.isInteger(input.unitNo) && Number(input.unitNo) > 0) segments.push(`U${String(input.unitNo).padStart(2, '0')}`);
		if (!Number.isInteger(input.chapterNo) || input.chapterNo < 1) throw new RangeError('chapterNo must be a positive integer');
		segments.push(`C${String(input.chapterNo).padStart(3, '0')}`);
		return segments.join('-');
	}
}
