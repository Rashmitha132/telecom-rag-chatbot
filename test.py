from openai import OpenAI

client = OpenAI(base_url="http://localhost:1234/v1", api_key="not-needed")

response = client.chat.completions.create(
    model="llama-3.2-3b-instruct",
    messages=[
        {"role": "system", "content": "You are a helpful Nokia telecom assistant."},
        {"role": "user", "content": "What is 5G?"}
    ]
)

print(response.choices[0].message.content)