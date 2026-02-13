export const onRequestPost: PagesFunction = async (context) => {
    const { messages }: any = await context.request.json();
    const lastMessage = messages[messages.length - 1];

    // Mock response logic
    let responseText = "I'm here to help you customize your beauty experience at The MOST. How can I assist you today?";

    if (lastMessage.content.toLowerCase().includes('facial')) {
        responseText = "For first-time visitors, I highly recommend our Hydra-Glow Facial. It's perfect for deep hydration and giving you that radiant 'glass skin' look. Would you like to book it?";
    } else if (lastMessage.content.toLowerCase().includes('wedding')) {
        responseText = "Congratulations! For weddings, our Bridal Makeup package is designed to look flawless in photos and last all day. We also recommend a trial session 2 weeks prior.";
    } else if (lastMessage.content.toLowerCase().includes('book')) {
        responseText = "You can easily book online by clicking the 'Book Now' button. Do you need help choosing a stylist?";
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            const tokens = responseText.split(' ');
            for (const token of tokens) {
                controller.enqueue(encoder.encode(token + ' '));
                await new Promise(r => setTimeout(r, 50)); // simulate typing
            }
            controller.close();
        }
    });

    return new Response(readable, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
};
