export const cleanString = (userInput) => {
  // this is a simple allowlist that I'm starting with. if you wanna add more
  // you can, just keep in mind that any "'{} & other special characters used as
  // airtable functions SHOULD NOT BE ALLOWED in here
  return userInput.match(/[a-zA-Z0-9@#$%^&+_\-=?:/]/g)?.join('') || ''
}
