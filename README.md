# persontric
Person Centric auth library. Persontric is hard forked from Lucia v3. It uses oslo & is compatible with arctic.

## Under Development

This library is not yet released on npm. Expect churn. Probably not ready for production usage unless you are [the author](https://github.com/btakita/) or work with him. If you are inclined, you are free to use, modify, or fork this library.

## What is a Person Centric architecture

A [Person Centric Architecture](https://evomimic.gitbook.io/map-book/person-centric-architecture) moves the notion of data ownership from apps to each person. This means a person owns their own data & give permission to apps to use their data. This promotes data soverignity...meaning people can limit who accesses their data via permissions & digital contracts.

## Why fork Lucia?

The goal of this project is to be ontologically consistent with Person Centric architectures such as [MAP Holons](https://github.com/evomimic/map-holons). MAP is still in the prototype phase.

This auth library will be used in web applications in the mean time. Further exploration into a Person Centric stack will be conducted.

This project follows the [tag vector](https://briantakita.me/posts/tag-vector-0-introduction) name system.

## Adapters

Like Lucia, Persontric supports adapters. I am primarily using bunjs, drizzle, & sqlite, so @persontric/adapter-drizzle & @persontric/adapter-sqlite is used within my apps. Expect the best support for those.

The following adapters are present:

- [@persontric/adapter-drizzle](https://github.com/persontric/adapter-drizzle/)
- [@persontric/adapter-mongodb](https://github.com/persontric/adapter-mongodb/)
- [@persontric/adapter-mysql](https://github.com/persontric/adapter-mysql/)
- [@persontric/adapter-postgresql](https://github.com/persontric/adapter-postgresql/)
- [@persontric/adapter-prisma](https://github.com/persontric/adapter-prisma/)
- [@persontric/adapter-sqlite](https://github.com/persontric/adapter-sqlite/)

## Not related to Person Centric Identity Services (PCIS)

Note that this project is not related to the Person Centric Identity Services (PCIS) Initiative by the US Government. Other than the name, I have no knowledge of the PCIS architecture or implementation. Any similarities are coincidence.
