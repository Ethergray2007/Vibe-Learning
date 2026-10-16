#include "output.h"

int main() {
    TGAImage image(16, 16, TGAImage::RGB);
    const TGAColor color = {0, 0, 255, 255};
    image.set(4, 6, color);
    return save_preview(image) ? 0 : 1;
}
