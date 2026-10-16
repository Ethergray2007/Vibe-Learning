#include "output.h"

int main() {
    TGAImage image(16, 16, TGAImage::RGB);
    // EDIT BEGIN: B, G, R, A
    const TGAColor color = {255, 255, 255, 255};
    // EDIT END
    image.set(4, 6, color);
    return save_preview(image) ? 0 : 1;
}
