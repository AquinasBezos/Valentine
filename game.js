// ─── Valentine's Path Game ───────────────────────────────────────────────────

// ─── Scene 1: Main Gameplay ─────────────────────────────────────────────────
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Character frames – Down & Up use uppercase prefix, Left & Right lowercase
        for (let i = 1; i <= 6; i++) {
            this.load.image(`down_${i}`, `VicSprite/Down/Base_run_down_${i}.png`);
            this.load.image(`up_${i}`, `VicSprite/Up/Base_run_up_${i}.png`);
            this.load.image(`left_${i}`, `VicSprite/Left/base_run_left_${i}.png`);
            this.load.image(`right_${i}`, `VicSprite/Right/base_run_right_${i}.png`);
        }

        // Trail & ending assets
        this.load.image('petal', 'Petal trail.png');
        this.load.image('heartScene', 'HeartScene.png');
        this.load.image('lovely', 'Lovely Sprite.png');
        this.load.image('pooks', 'PooksSprite.png');
    }

    create() {
        // ── World background ────────────────────────────────────────────────
        this.cameras.main.setBackgroundColor('#2b0e2e');

        // ── Petal trail layout ──────────────────────────────────────────────
        // 3 segments, each 510px long (10 petals × 51px spacing)
        const PETALS_PER = 10;
        const SPACING = 51;   // one full petal-width between centres

        // Start position
        const startX = 400;
        const startY = 700;

        // Segment 1 — UP (decreasing Y)
        let petalIndex = 0;
        for (let i = 0; i < PETALS_PER; i++) {
            this.add.image(startX, startY - i * SPACING, 'petal').setDepth(0).setFlipX(petalIndex % 2 === 1);
            petalIndex++;
        }
        const seg1EndX = startX;
        const seg1EndY = startY - (PETALS_PER - 1) * SPACING;

        // Segment 2 — RIGHT (increasing X)
        for (let i = 1; i < PETALS_PER; i++) {
            this.add.image(seg1EndX + i * SPACING, seg1EndY, 'petal').setDepth(0).setFlipX(petalIndex % 2 === 1);
            petalIndex++;
        }
        const seg2EndX = seg1EndX + (PETALS_PER - 1) * SPACING;
        const seg2EndY = seg1EndY;

        // Segment 3 — UP (decreasing Y)
        for (let i = 1; i < PETALS_PER; i++) {
            this.add.image(seg2EndX, seg2EndY - i * SPACING, 'petal').setDepth(0).setFlipX(petalIndex % 2 === 1);
            petalIndex++;
        }
        const seg3EndX = seg2EndX;
        const seg3EndY = seg2EndY - (PETALS_PER - 1) * SPACING;

        // ── Expand physics world so the large trail is fully traversable ────
        // Give generous padding around the entire path area
        const worldLeft = 0;
        const worldTop = seg3EndY - 200;
        const worldWidth = seg2EndX + 400;
        const worldHeight = startY + 200 - worldTop;
        this.physics.world.setBounds(worldLeft, worldTop, worldWidth, worldHeight);

        // ── Trigger zone at end of trail ────────────────────────────────────
        this.endZone = this.add.zone(seg3EndX, seg3EndY - 30, 50, 50);
        this.physics.world.enable(this.endZone);
        this.endZone.body.setAllowGravity(false);
        this.endZone.body.moves = false;

        // Store end-of-trail coords for the in-world heart scene
        this.trailEndX = seg3EndX;
        this.trailEndY = seg3EndY;

        // ── Character ───────────────────────────────────────────────────────
        this.player = this.physics.add.sprite(startX, startY + 40, 'down_1');
        this.player.setDepth(1);
        this.player.setCollideWorldBounds(false);

        // Build animations from individual images
        const directions = ['down', 'up', 'left', 'right'];
        directions.forEach(dir => {
            const frames = [];
            for (let i = 1; i <= 6; i++) {
                frames.push({ key: `${dir}_${i}` });
            }
            this.anims.create({
                key: `walk_${dir}`,
                frames: frames,
                frameRate: 10,
                repeat: -1
            });
        });

        this.currentDir = 'down';

        // ── Helper text ─────────────────────────────────────────────────────
        this.helperText = this.add.text(startX, startY + 72, 'Use arrow keys or WASD keys to move', {
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            color: '#ffbbcc',
            stroke: '#1a0a1e',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(2);

        this.helperFading = false; // guard against multiple tweens

        // ── Input ───────────────────────────────────────────────────────────
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };

        // ── Camera follows player ───────────────────────────────────────────
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setZoom(2);

        // ── Overlap detection ───────────────────────────────────────────────
        this.physics.add.overlap(this.player, this.endZone, this.reachEnd, null, this);
        this.reachedEnd = false;
    }

    update() {

        const speed = 120;
        let vx = 0;
        let vy = 0;
        let moving = false;

        // Horizontal
        if (this.cursors.left.isDown || this.wasd.A.isDown) {
            vx = -speed;
            this.currentDir = 'left';
            moving = true;
        } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
            vx = speed;
            this.currentDir = 'right';
            moving = true;
        }

        // Vertical
        if (this.cursors.up.isDown || this.wasd.W.isDown) {
            vy = -speed;
            this.currentDir = 'up';
            moving = true;
        } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
            vy = speed;
            this.currentDir = 'down';
            moving = true;
        }

        this.player.setVelocity(vx, vy);

        if (moving) {
            this.player.anims.play(`walk_${this.currentDir}`, true);

            // Fade out helper text once (only trigger the tween once)
            if (this.helperText && !this.helperFading) {
                this.helperFading = true;
                this.tweens.add({
                    targets: this.helperText,
                    alpha: 0,
                    duration: 600,
                    onComplete: () => {
                        if (this.helperText) {
                            this.helperText.destroy();
                            this.helperText = null;
                        }
                    }
                });
            }
        } else {
            this.player.setVelocity(0, 0);
            this.player.anims.stop();
            this.player.setTexture(`${this.currentDir}_1`);
        }
    }

    reachEnd() {
        if (this.reachedEnd) return;
        this.reachedEnd = true;

        // ── In-world Valentine's scene at the end of the trail ──────────
        const cx = this.trailEndX;
        const cy = this.trailEndY - 60;

        // Heart background placed in-world
        const heart = this.add.image(cx, cy, 'heartScene').setDepth(2).setAlpha(0);

        // Lovely & Pooks – 16px closer together (8px each from centre)
        const lovely = this.add.image(cx - 8, cy + 10, 'lovely').setDepth(3).setDisplaySize(32, 32).setAlpha(0);
        const pooks = this.add.image(cx + 8, cy + 10, 'pooks').setDepth(3).setDisplaySize(32, 32).setAlpha(0);

        // Title text – positioned above the heart
        const title = this.add.text(cx, cy - heart.height / 2 - 16, 'Happy Valentines Day!', {
            fontFamily: 'Georgia, serif',
            fontSize: '18px',
            color: '#ff4477',
            stroke: '#ffffff',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(3).setAlpha(0);

        // Fade-in sequence
        this.tweens.add({
            targets: heart,
            alpha: 1,
            duration: 1500,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.tweens.add({ targets: [lovely, pooks], alpha: 1, duration: 1000, ease: 'Sine.easeInOut' });
                this.tweens.add({ targets: title, alpha: 1, duration: 1200, ease: 'Sine.easeInOut' });
            }
        });
    }
}

// EndScene removed – Valentine's reveal now happens in-world at the trail endpoint

// ─── Phaser Config ──────────────────────────────────────────────────────────
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [GameScene],
    pixelArt: true
};

const game = new Phaser.Game(config);
