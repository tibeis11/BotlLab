import { generateLabelPdfFromDesign } from '../../lib/pdf-generator';
import { LabelDesign, LabelVariables } from '../../lib/types/label-system';

self.onmessage = async (e: MessageEvent) => {
    const { template, variables, origin } = e.data as { template: LabelDesign, variables: LabelVariables[], origin: string };

    try {
        const doc = await generateLabelPdfFromDesign(template, variables, origin);
        const arrayBuffer = doc.output('arraybuffer');
        
        self.postMessage({ status: 'success', pdfBuffer: arrayBuffer }, { transfer: [arrayBuffer] } as any);
    } catch (error: any) {
        console.error("Worker PDF Gen Error:", error);
        self.postMessage({ status: 'error', message: error.message || 'Unknown error' });
    }
};
