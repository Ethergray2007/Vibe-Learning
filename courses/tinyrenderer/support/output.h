#pragma once
#include "tgaimage.h"
#include <fstream>
#include <cstdint>

// Course-only helper. BMP rows are bottom-up; learner coordinates are top-left.
inline bool save_preview(const TGAImage &image) {
    if (!image.write_tga_file("framebuffer.tga", false, false)) return false;
    std::ofstream out("preview.bmp", std::ios::binary);
    auto u16 = [&](std::uint32_t n) { out.put(char(n)); out.put(char(n >> 8)); };
    auto u32 = [&](std::uint32_t n) { u16(n); u16(n >> 16); };
    const int w = image.width(), h = image.height();
    const int stride = (w * 3 + 3) & ~3;
    out.put('B'); out.put('M'); u32(54 + stride * h); u32(0); u32(54);
    u32(40); u32(w); u32(h); u16(1); u16(24); u32(0);
    u32(stride * h); u32(0); u32(0); u32(0); u32(0);
    for (int y = h - 1; y >= 0; --y) {
        for (int x = 0; x < w; ++x) {
            auto c = image.get(x, y);
            out.put(char(c[0])); out.put(char(c[1])); out.put(char(c[2]));
        }
        for (int p = w * 3; p < stride; ++p) out.put(0);
    }
    out.flush();
    return out.good();
}
