/**
 * Fast Fourier Transform (FFT) - Cooley-Tukey implementation
 * Optimised for baby cry spectrogram generation.
 */

function bitReverse(n, bits) {
    let reversed = 0;
    for (let i = 0; i < bits; i++) {
        reversed = (reversed << 1) | (n & 1);
        n >>= 1;
    }
    return reversed;
}

/**
 * Perform FFT on real-valued input.
 * Returns magnitudes of the first N/2 + 1 bins.
 */
export function fft(input) {
    const N = input.length;
    const bits = Math.log2(N);
    
    // Complex arrays
    const re = new Float32Array(N);
    const im = new Float32Array(N);
    
    // Bit-reverse permutation
    for (let i = 0; i < N; i++) {
        re[bitReverse(i, bits)] = input[i];
    }
    
    // Iterative FFT
    for (let s = 1; s <= bits; s++) {
        const m = 1 << s;
        const m2 = m >> 1;
        const theta = -2 * Math.PI / m;
        const w_step_re = Math.cos(theta);
        const w_step_im = Math.sin(theta);
        
        for (let k = 0; k < N; k += m) {
            let w_re = 1;
            let w_im = 0;
            for (let j = 0; j < m2; j++) {
                const u_re = re[k + j];
                const u_im = im[k + j];
                const v_re = re[k + j + m2] * w_re - im[k + j + m2] * w_im;
                const v_im = re[k + j + m2] * w_im + im[k + j + m2] * w_re;
                
                re[k + j] = u_re + v_re;
                im[k + j] = u_im + v_im;
                re[k + j + m2] = u_re - v_re;
                im[k + j + m2] = u_im - v_im;
                
                const next_w_re = w_re * w_step_re - w_im * w_step_im;
                w_im = w_re * w_step_im + w_im * w_step_re;
                w_re = next_w_re;
            }
        }
    }
    
    // Compute magnitudes for first N/2 + 1 bins
    const numBins = N / 2 + 1;
    const magnitudes = new Float32Array(numBins);
    for (let i = 0; i < numBins; i++) {
        magnitudes[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
    }
    return magnitudes;
}
